"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = {
    visited: new Set(),
    phishScore: null,
    quizScore: null,
    riskLevel: null,
    websiteComplete: false
  };
  const moduleIds = ["learn", "danger", "types", "challenge", "websites", "social", "examples", "prevention", "risk", "quiz"];

  // Navigation
  const header = $("#siteHeader");
  const menuToggle = $("#menuToggle");
  const navLinks = $("#navLinks");
  const scrollTopButton = $("#scrollTop");
  const closeMenu = () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    menuToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
  };
  menuToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    menuToggle.innerHTML = `<i class="fa-solid fa-${open ? "xmark" : "bars"}"></i>`;
  });
  $$("#navLinks a").forEach(link => link.addEventListener("click", closeMenu));

  const sections = $$("main section[id]");
  const navigationItems = $$("#navLinks a");
  const updateOnScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 20);
    scrollTopButton.classList.toggle("show", window.scrollY > 600);
    const marker = window.scrollY + 180;
    let currentId = "home";
    sections.forEach(section => { if (section.offsetTop <= marker) currentId = section.id; });
    navigationItems.forEach(link => {
      link.classList.toggle("active", link.hash === `#${currentId}` ||
        (link.hash === "#learn" && ["danger", "types", "websites", "social", "examples"].includes(currentId)));
    });
  };
  window.addEventListener("scroll", updateOnScroll, { passive: true });
  updateOnScroll();
  scrollTopButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }));

  // Reveal animations and module progress
  const revealElements = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .1 });
    revealElements.forEach((element, index) => {
      if (!reducedMotion) element.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
      revealObserver.observe(element);
    });
    const moduleObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          state.visited.add(entry.target.id);
          updateDashboard();
        }
      });
    }, { threshold: .12 });
    moduleIds.forEach(id => moduleObserver.observe(document.getElementById(id)));
  } else {
    revealElements.forEach(element => element.classList.add("visible"));
  }

  // Shared dashboard and completion state
  function updateDashboard() {
    const completed = state.visited.size;
    const percent = Math.round((completed / moduleIds.length) * 100);
    $("#progressFill").style.width = `${percent}%`;
    $("#progressText").textContent = `${percent}% complete`;
    $("#summaryModules").textContent = `${completed} / ${moduleIds.length}`;
    $("#summaryQuiz").textContent = state.quizScore === null ? "Not submitted" : `${state.quizScore} / 5`;
    $("#summaryPhish").textContent = state.phishScore === null ? "Not submitted" : `${state.phishScore} / 6`;
    $("#summaryRisk").textContent = state.riskLevel || "Not assessed";

    const finished = state.phishScore !== null && state.quizScore !== null && state.riskLevel && state.websiteComplete;
    $("#summaryStatus").textContent = finished ? "Completed" : "In progress";
    $(".status-card").classList.toggle("complete", Boolean(finished));
    $("#complete").classList.toggle("achieved", Boolean(finished));
    $("#completionKicker").textContent = finished ? "Training complete" : "Finish the activities";
    $("#completionTitle").textContent = finished ? "Congratulations!" : "Almost there!";
    $("#completionMessage").innerHTML = finished
      ? 'You have successfully completed the <strong>Phishing Awareness Training Module.</strong>'
      : "Complete the phishing challenge, website challenge, risk assessment, and quiz to finish your training.";
  }

  // Clickable phishing-email hotspots
  const targets = $$(".phish-target");
  let phishLocked = false;
  function toggleTarget(target) {
    if (phishLocked) return;
    target.classList.toggle("selected");
    target.setAttribute("aria-pressed", String(target.classList.contains("selected")));
    $("#selectionCount").textContent = $$(".phish-target.selected").length;
  }
  targets.forEach(target => {
    target.addEventListener("click", event => {
      if (target.tagName === "BUTTON") event.preventDefault();
      toggleTarget(target);
    });
    target.addEventListener("keydown", event => {
      if ((event.key === "Enter" || event.key === " ") && target.tagName !== "BUTTON") {
        event.preventDefault();
        toggleTarget(target);
      }
    });
  });
  $("#phishSubmit").addEventListener("click", () => {
    if (phishLocked) return;
    phishLocked = true;
    let correct = 0;
    let incorrect = 0;
    targets.forEach(target => {
      const selected = target.classList.contains("selected");
      const isCorrect = target.dataset.correct === "true";
      target.classList.remove("selected");
      target.classList.add("locked");
      if (selected && isCorrect) { target.classList.add("correct"); correct += 1; }
      else if (selected) { target.classList.add("incorrect"); incorrect += 1; }
      else if (isCorrect) target.classList.add("missed");
      target.setAttribute("tabindex", "-1");
    });
    state.phishScore = correct;
    $("#phishScore").classList.add("show");
    $("#phishScore").textContent = `${correct}/6 correct${incorrect ? ` · ${incorrect} incorrect` : ""}`;
    $("#answers").classList.add("show");
    $("#phishSubmit").disabled = true;
    $("#phishSubmit").innerHTML = 'Findings Submitted <i class="fa-solid fa-lock"></i>';
    updateDashboard();
  });

  // Fake website choice challenge
  let selectedSite = null;
  let websiteLocked = false;
  const siteChoices = $$(".site-choice");
  function chooseSite(card) {
    if (websiteLocked) return;
    siteChoices.forEach(choice => {
      choice.classList.toggle("selected", choice === card);
      choice.setAttribute("aria-pressed", String(choice === card));
    });
    selectedSite = card.dataset.site;
    $("#websiteSubmit").disabled = false;
  }
  siteChoices.forEach(card => {
    card.addEventListener("click", () => chooseSite(card));
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseSite(card); }
    });
  });
  $("#websiteSubmit").addEventListener("click", () => {
    if (!selectedSite || websiteLocked) return;
    websiteLocked = true;
    const correct = selectedSite === "fake";
    siteChoices.forEach(card => {
      card.classList.remove("selected");
      card.classList.add("locked");
      card.setAttribute("tabindex", "-1");
      if (card.dataset.site === "fake") card.classList.add("choice-correct");
      else if (selectedSite === "legitimate") card.classList.add("choice-wrong");
    });
    const feedback = $("#websiteFeedback");
    feedback.className = `website-feedback show ${correct ? "success" : "error"}`;
    feedback.innerHTML = correct
      ? '<i class="fa-solid fa-circle-check"></i> Correct! Website B is fraudulent.'
      : '<i class="fa-solid fa-circle-xmark"></i> Not quite. Website B is the fraudulent site.';
    $("#websiteExplanation").classList.add("show");
    $("#websiteSubmit").disabled = true;
    state.websiteComplete = true;
    updateDashboard();
  });

  // Risk assessment with meter and tailored recommendations
  const riskForm = $("#riskForm");
  riskForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!riskForm.reportValidity()) return;
    const values = Object.fromEntries(new FormData(riskForm));
    const score = Object.values(values).reduce((sum, value) => sum + Number(value), 0);
    const result = score <= 2
      ? { level: "Low Risk", className: "low", icon: "shield-halved", text: "Your protective habits are strong." }
      : score <= 5
        ? { level: "Medium Risk", className: "medium", icon: "triangle-exclamation", text: "A few habits could expose your accounts." }
        : { level: "High Risk", className: "high", icon: "shield-virus", text: "Your current habits create significant exposure." };
    const recommendations = [];
    if (Number(values.reuse) > 0) recommendations.push("Use a password manager to create a unique password for every account.");
    if (Number(values.links) > 0) recommendations.push("Pause and inspect full link destinations before opening them.");
    if (Number(values.mfa) > 0) recommendations.push("Enable MFA on email, banking, work, and social accounts.");
    if (Number(values.updates) > 0) recommendations.push("Turn on automatic software and security updates.");
    if (!recommendations.length) recommendations.push("Maintain your habits and continue reporting suspicious messages.");

    $("#riskOutput").classList.add("show");
    $("#riskMeterFill").style.width = `${(score / 8) * 100}%`;
    $("#riskNeedle").style.left = `calc(${Math.min((score / 8) * 100, 99)}% - 2px)`;
    $("#riskResult").className = `result-box show ${result.className}`;
    $("#riskResult").innerHTML = `<i class="fa-solid fa-${result.icon}"></i><div><strong>${result.level} · ${score}/8</strong><span>${result.text}</span></div>`;
    $("#riskRecommendations").innerHTML = recommendations.map(item => `<li>${item}</li>`).join("");
    state.riskLevel = result.level;
    updateDashboard();
  });

  // Quiz validation, answer review, locking, and scoring
  const quizForm = $("#quizForm");
  const correctAnswers = { q1: "b", q2: "c", q3: "a", q4: "c", q5: "b" };
  let quizLocked = false;
  quizForm.addEventListener("submit", event => {
    event.preventDefault();
    if (quizLocked) return;
    const data = new FormData(quizForm);
    const unanswered = Object.keys(correctAnswers).filter(question => !data.get(question));
    if (unanswered.length) {
      $("#quizError").textContent = `Please answer all questions (${unanswered.length} remaining).`;
      quizForm.querySelector(`[name="${unanswered[0]}"]`).focus();
      return;
    }
    quizLocked = true;
    $("#quizError").textContent = "";
    let score = 0;
    Object.entries(correctAnswers).forEach(([question, answer]) => {
      const card = $(`.quiz-card[data-question="${question}"]`);
      const selected = data.get(question);
      card.classList.add("submitted");
      card.querySelectorAll("input").forEach(input => {
        input.disabled = true;
        const label = input.closest("label");
        if (input.value === answer) label.classList.add("correct-answer");
        if (input.checked && input.value !== answer) label.classList.add("wrong-answer");
      });
      if (selected === answer) {
        score += 1;
        card.classList.add("answer-success");
      }
    });
    const message = score === 5 ? "Excellent—you are ready to spot the warning signs."
      : score >= 3 ? "Good work. Review the explanations for the questions you missed."
        : "Review the explanations, then revisit the training sections to sharpen your instincts.";
    $("#quizResult").classList.add("show");
    $("#quizResult").innerHTML = `<strong>${score} / 5</strong><p>${message}</p>`;
    $(".submit-quiz").disabled = true;
    $(".submit-quiz").innerHTML = 'Quiz Submitted <i class="fa-solid fa-lock"></i>';
    state.quizScore = score;
    updateDashboard();
    $("#quizResult").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  });

  $("#year").textContent = new Date().getFullYear();
  updateDashboard();
});
