(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.DiagcalcDatasets = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const datasets = {
    screening: {
      tp: 42,
      fp: 58,
      fn: 18,
      tn: 882,
      preTestProb: 6,
      name: "Screening programme (low prevalence)",
      description: "Generic population screening scenario with low prevalence.",
      reference: null,
    },
    caseControl: {
      tp: 92,
      fp: 18,
      fn: 8,
      tn: 82,
      preTestProb: 50,
      name: "Case-control study",
      description: "Typical case-control design with artificially balanced prevalence.",
      reference: null,
    },
    clinic: {
      tp: 75,
      fp: 25,
      fn: 10,
      tn: 140,
      preTestProb: 40,
      name: "Specialist clinic",
      description: "Specialist clinic setting with intermediate prevalence.",
      reference: null,
    },
    ddimer: {
      tp: 195,
      fp: 87,
      fn: 5,
      tn: 413,
      preTestProb: 28.6,
      name: "D-dimer for pulmonary embolism",
      description: "Low Wells score + D-dimer to rule out pulmonary embolism in the emergency department.",
      lastReviewed: "2026-05-13",
      reference: {
        authors: "Righini M, et al.",
        title: "Age-Adjusted D-Dimer Cutoff Levels to Rule Out Pulmonary Embolism",
        journal: "JAMA. 2014;311(11):1117-1124",
        doi: "10.1001/jama.2014.2135",
        url: "https://jamanetwork.com/journals/jama/fullarticle/1839153",
      },
    },
    troponin: {
      tp: 289,
      fp: 156,
      fn: 11,
      tn: 1544,
      preTestProb: 15,
      name: "High-sensitivity troponin for AMI",
      description: "High-sensitivity troponin for diagnosis of acute myocardial infarction.",
      lastReviewed: "2026-05-13",
      reference: {
        authors: "Reichlin T, et al.",
        title: "Early Diagnosis of Myocardial Infarction with Sensitive Cardiac Troponin Assays",
        journal: "N Engl J Med. 2009;361(9):858-867",
        doi: "10.1056/NEJMoa0900428",
        url: "https://www.nejm.org/doi/full/10.1056/NEJMoa0900428",
      },
    },
    mammography: {
      tp: 7,
      fp: 93,
      fn: 3,
      tn: 897,
      preTestProb: 1,
      name: "Screening mammography",
      description: "Mammographic screening in women aged 50-69 (aggregated data).",
      lastReviewed: "2026-05-13",
      reference: {
        authors: "Kopans DB, et al.",
        title: "Screening Mammography Performance Metrics",
        journal: "Radiology. 2020;297(2):239-240",
        doi: "10.1148/radiol.2020203635",
        url: "https://pubs.rsna.org/doi/10.1148/radiol.2020203635",
      },
    },
    covid_antigen: {
      tp: 103,
      fp: 8,
      fn: 47,
      tn: 192,
      preTestProb: 42.9,
      name: "Rapid COVID-19 antigen test",
      description: "Rapid antigen test for SARS-CoV-2 in symptomatic patients (first 7 days).",
      lastReviewed: "2026-05-13",
      reference: {
        authors: "Dinnes J, et al.",
        title: "Rapid, Point-of-Care Antigen Tests for COVID-19",
        journal: "Cochrane Database Syst Rev. 2022;7:CD013705",
        doi: "10.1002/14651858.CD013705.pub3",
        url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD013705.pub3",
      },
    },
    hiv_elisa: {
      tp: 199,
      fp: 1,
      fn: 1,
      tn: 9799,
      preTestProb: 2,
      name: "HIV ELISA",
      description: "4th-generation ELISA for HIV screening in the general population.",
      lastReviewed: "2026-05-13",
      reference: {
        authors: "Masciotra S, et al.",
        title: "Performance of HIV Diagnostic Tests",
        journal: "J Clin Microbiol. 2013;51(6):1694-1700",
        doi: "10.1128/JCM.03552-12",
        url: "https://journals.asm.org/doi/10.1128/JCM.03552-12",
      },
    },
    strep_throat: {
      tp: 142,
      fp: 25,
      fn: 18,
      tn: 315,
      preTestProb: 32,
      name: "Rapid Streptococcus test",
      description: "Rapid antigen test for streptococcal pharyngitis in children with fever and sore throat.",
      lastReviewed: "2026-05-13",
      reference: {
        authors: "Cohen JF, et al.",
        title: "Rapid Antigen Detection Test for Group A Streptococcus in Children",
        journal: "Cochrane Database Syst Rev. 2016;7:CD010502",
        doi: "10.1002/14651858.CD010502.pub2",
        url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD010502.pub2",
      },
    },
    xray_pneumonia: {
      tp: 168,
      fp: 82,
      fn: 32,
      tn: 318,
      preTestProb: 33.3,
      name: "Chest X-ray for pneumonia",
      description: "Chest X-ray for community-acquired pneumonia in symptomatic adults.",
      lastReviewed: "2026-05-13",
      reference: {
        authors: "Hagaman JT, et al.",
        title: "Admission Chest Radiograph Lacks Sensitivity in Pneumonia",
        journal: "Am J Med Sci. 2009;337(4):236-240",
        doi: "10.1097/MAJ.0b013e31818ad805",
        url: "https://www.amjmedsci.org/",
      },
    },
    wells_dvt: {
      tp: 60,
      fp: 85,
      fn: 15,
      tn: 340,
      preTestProb: 15,
      name: "Wells score (≥2) for DVT",
      description: "Wells clinical prediction rule (cut-off ≥2 points = 'DVT likely') applied to outpatients with suspected lower-limb deep vein thrombosis.",
      lastReviewed: "2026-05-13",
      reference: {
        authors: "Wells PS, et al.",
        title: "Evaluation of D-Dimer in the Diagnosis of Suspected Deep-Vein Thrombosis",
        journal: "N Engl J Med. 2003;349(13):1227-1235",
        doi: "10.1056/NEJMoa023153",
        url: "https://www.nejm.org/doi/full/10.1056/NEJMoa023153",
      },
    },
    heart_acs: {
      tp: 380,
      fp: 1020,
      fn: 20,
      tn: 1020,
      preTestProb: 17,
      name: "HEART score (≥4) for MACE in chest pain",
      description: "HEART score (History, ECG, Age, Risk factors, Troponin) ≥4 to predict 6-week major adverse cardiac events in undifferentiated ED chest pain.",
      lastReviewed: "2026-05-13",
      reference: {
        authors: "Backus BE, et al.",
        title: "A prospective validation of the HEART score for chest pain patients at the emergency department",
        journal: "Int J Cardiol. 2013;168(3):2153-2158",
        doi: "10.1016/j.ijcard.2013.01.255",
        url: "https://www.internationaljournalofcardiology.com/article/S0167-5273(13)00253-2/fulltext",
      },
    },
    curb65: {
      tp: 72,
      fp: 214,
      fn: 24,
      tn: 758,
      preTestProb: 9,
      name: "CURB-65 (≥2) for severe community-acquired pneumonia",
      description: "CURB-65 score ≥2 as a marker of severe community-acquired pneumonia / 30-day mortality, derived/validated across UK, NZ and Netherlands cohorts.",
      lastReviewed: "2026-05-13",
      reference: {
        authors: "Lim WS, et al.",
        title: "Defining community acquired pneumonia severity on presentation to hospital: an international derivation and validation study",
        journal: "Thorax. 2003;58(5):377-382",
        doi: "10.1136/thorax.58.5.377",
        url: "https://thorax.bmj.com/content/58/5/377",
      },
    },
    qsofa: {
      tp: 55,
      fp: 180,
      fn: 45,
      tn: 720,
      preTestProb: 10,
      name: "qSOFA (≥2) for sepsis screening",
      description: "Quick SOFA score ≥2 (SBP ≤100, RR ≥22, altered mentation) as a bedside screen for in-hospital mortality among patients with suspected infection outside the ICU.",
      lastReviewed: "2026-05-13",
      reference: {
        authors: "Seymour CW, et al.",
        title: "Assessment of Clinical Criteria for Sepsis (Sepsis-3)",
        journal: "JAMA. 2016;315(8):762-774",
        doi: "10.1001/jama.2016.0288",
        url: "https://jamanetwork.com/journals/jama/fullarticle/2492875",
      },
    },
    apgar_5min: {
      tp: 20,
      fp: 200,
      fn: 60,
      tn: 19720,
      preTestProb: 0.4,
      name: "APGAR < 7 at 5 min for severe neonatal outcome",
      description: "Five-minute APGAR score below 7 as a predictor of neonatal death in term infants. Illustrates a highly specific but low-sensitivity test at very low disease prevalence.",
      lastReviewed: "2026-05-13",
      reference: {
        authors: "Casey BM, McIntire DD, Leveno KJ.",
        title: "The continuing value of the Apgar score for the assessment of newborn infants",
        journal: "N Engl J Med. 2001;344(7):467-471",
        doi: "10.1056/NEJM200102153440701",
        url: "https://www.nejm.org/doi/full/10.1056/NEJM200102153440701",
      },
    },
    fast_trauma: {
      tp: 110,
      fp: 28,
      fn: 19,
      tn: 1383,
      preTestProb: 8,
      name: "FAST ultrasound for blunt abdominal trauma",
      description: "Focused Assessment with Sonography for Trauma (surgeon-performed) for intra-abdominal injury in blunt trauma patients.",
      lastReviewed: "2026-05-13",
      reference: {
        authors: "Rozycki GS, et al.",
        title: "A prospective study of surgeon-performed ultrasound as the primary adjuvant modality for injured patient assessment",
        journal: "Ann Surg. 1998;228(4):557-567",
        doi: "10.1097/00000658-199810000-00012",
        url: "https://journals.lww.com/annalsofsurgery/Fulltext/1998/10000/A_Prospective_Study_of_Surgeon_Performed.12.aspx",
      },
    },
  };

  function getDataset(key) {
    if (!Object.prototype.hasOwnProperty.call(datasets, key)) {
      return null;
    }

    return datasets[key];
  }

  function listDatasets() {
    return Object.keys(datasets).map((key) => ({
      key,
      ...datasets[key],
    }));
  }

  return {
    datasets,
    getDataset,
    listDatasets,
  };
}));
