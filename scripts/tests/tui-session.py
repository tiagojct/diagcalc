"""Exercise the real Blessed UI in a pseudo-terminal, including report export."""
import fcntl
import json
import os
from pathlib import Path
import pty
import select
import signal
import struct
import sys
import tempfile
import termios
import time

root = Path(__file__).resolve().parents[2]
node = sys.argv[1]
with tempfile.TemporaryDirectory(prefix="diagcalc-tui-") as folder:
    child, master = pty.fork()
    if child == 0:
        os.environ["TERM"] = "xterm-256color"
        os.chdir(folder)
        os.execv(node, [node, str(root / "bin/diagcalc.js"), "--tui"])
    fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack("HHHH", 60, 180, 0, 0))
    transcript = bytearray()

    def drain(seconds=0.2):
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            ready, _, _ = select.select([master], [], [], min(0.05, max(0, end - time.monotonic())))
            if ready:
                try:
                    chunk = os.read(master, 65536)
                except OSError:
                    break
                if not chunk:
                    break
                transcript.extend(chunk)

    def send(data, delay=0.15):
        os.write(master, data)
        drain(delay)

    def wait_until(predicate, message, timeout=3):
        deadline = time.monotonic() + timeout
        while not predicate():
            if time.monotonic() >= deadline:
                raise AssertionError(message + ": " + transcript[-3000:].decode(errors="replace"))
            drain(0.1)

    try:
        drain(1)
        assert b"DIAGCALC" in transcript, "UI did not start"
        send(b"n")
        # TP=50, FP=0, TN=50, FN=0, pre=20 via the actual arrow navigation.
        send(b"50")
        send(b"\x1b[C")
        send(b"0")
        send(b"\x1b[B")
        send(b"50")
        send(b"\x1b[D")
        send(b"0")
        send(b"\x1b[B")
        send(b"20")
        send(b"+")
        # Chaining must retain 100%, not round an artificial 99.9999 to a rejected value.
        send(b"50")
        send(b"\x1b[C")
        send(b"10")
        send(b"\x1b[B")
        send(b"50")
        send(b"\x1b[D")
        send(b"10")
        send(b"x")
        report = Path(folder) / "report.txt"
        send(b"\x7f" * 200 + str(report).encode() + b"\r", 0.5)
        wait_until(report.exists, "UI did not export its report")
        content = report.read_text()
        assert "Engine " + json.loads((root / "package.json").read_text())["version"] in content, content
        assert "100.0%" in content, content
        assert "Validation:" not in content, content
        snapshot = json.loads(content.split("Reproducible snapshot (JSON)\n", 1)[1])
        assert snapshot["calculation"]["input"]["preTestProb"] == 100
        assert snapshot["previousTest"]["input"]["tp"] == 50
        # Close the saved-message modal, then deliberately submit invalid prompt input.
        drain(3.3)
        send(b"n")
        send(b"\r")
        send(b"-5\r")
        send(b"x")
        invalid = Path(folder) / "invalid.txt"
        send(b"\x7f" * 200 + str(invalid).encode() + b"\r", 0.5)
        wait_until(invalid.exists, "Invalid-input report was not exported")
        assert "Validation:" in invalid.read_text(), "-5 was silently changed into 5"
        drain(3.3)
        # Existing files must not be silently overwritten.
        original = invalid.read_text()
        send(b"x")
        send(b"\x7f" * 200 + str(invalid).encode() + b"\r", 0.5)
        assert invalid.read_text() == original
        wait_until(lambda: b"Export failed" in transcript or b"EEXIST" in transcript or b"file already exists" in transcript, "Overwrite did not report failure")
        drain(4.3)
        send(b"q")
        deadline = time.monotonic() + 3
        while True:
            waited, status = os.waitpid(child, os.WNOHANG)
            if waited:
                break
            if time.monotonic() >= deadline:
                raise AssertionError("TUI did not quit after q; last terminal output: " + transcript[-2000:].decode(errors="replace"))
            drain(0.1)
        child = None
        assert os.waitstatus_to_exitcode(status) == 0, "TUI did not exit cleanly"
        print(json.dumps({"launch": True, "exactChaining": True, "export": True, "invalidPrompt": True, "overwriteProtected": True, "cleanExit": True}))
    finally:
        if child is not None:
            os.kill(child, signal.SIGKILL)
            os.waitpid(child, 0)
        os.close(master)
