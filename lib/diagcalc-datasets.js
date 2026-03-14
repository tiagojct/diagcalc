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
      reference: {
        authors: "Hagaman JT, et al.",
        title: "Admission Chest Radiograph Lacks Sensitivity in Pneumonia",
        journal: "Am J Med Sci. 2009;337(4):236-240",
        doi: "10.1097/MAJ.0b013e31818ad805",
        url: "https://www.amjmedsci.org/",
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
