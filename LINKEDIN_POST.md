# LinkedIn Post

I have just released DIAGCALC.

DIAGCALC is a diagnostic test calculator built for teaching and practical use. It starts from a confusion matrix and helps users move from test performance measures to post-test probability in a clear and structured way.

It now has two interfaces:

- a web app for interactive use in the browser
- a terminal app with both TUI and CLI modes

Main features:

- sensitivity, specificity, PPV, and NPV
- LR+ and LR-
- positive and negative post-test probability
- preset diagnostic scenarios
- Fagan nomogram in the web app
- JSON output in the CLI for scripting

The main goal was to keep the tool simple, transparent, and useful in real teaching workflows. The web and terminal versions share the same calculation engine, so results stay consistent across interfaces.

Links:

- Web app: https://tiagojct.github.io/diagcalc/
- GitHub: https://github.com/tiagojct/diagcalc
- npm: https://www.npmjs.com/package/diagcalc

Install the terminal app:

```bash
npm install -g diagcalc
diag --tui
```

Feedback is welcome.
