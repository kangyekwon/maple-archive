/**
 * MapleStory Archive - Job Recommendation Quiz
 * Multi-question quiz that recommends a MapleStory job class based on answers
 */
(function () {
  'use strict';

  var container = null;
  var questions = [];
  var currentIndex = 0;
  var scores = {};
  var CLASS_TYPES = ['warrior', 'magician', 'bowman', 'thief', 'pirate'];

  var CLASS_INFO = {
    warrior: {
      name: 'Warrior',
      name_ko: '전사',
      color: '#e74c3c',
      description: 'You are brave, steadfast, and always ready to lead the charge. Warriors stand at the front line, protecting allies with unbreakable resolve and devastating melee attacks.'
    },
    magician: {
      name: 'Magician',
      name_ko: '마법사',
      color: '#3498db',
      description: 'You are wise, curious, and drawn to the mysteries of the arcane. Magicians command the elements and bend reality, wielding immense power from a distance.'
    },
    bowman: {
      name: 'Bowman',
      name_ko: '궁수',
      color: '#27ae60',
      description: 'You are precise, patient, and attuned to nature. Bowmen strike from afar with deadly accuracy, using the environment to their advantage.'
    },
    thief: {
      name: 'Thief',
      name_ko: '도적',
      color: '#8e44ad',
      description: 'You are cunning, agile, and thrive in the shadows. Thieves rely on speed and deception, delivering devastating surprise attacks before vanishing into the darkness.'
    },
    pirate: {
      name: 'Pirate',
      name_ko: '해적',
      color: '#e67e22',
      description: 'You are adventurous, bold, and fiercely independent. Pirates combine raw combat power with gadgets and guns, adapting to any situation with style.'
    }
  };

  var FALLBACK_QUESTIONS = [
    {
      question: 'A massive boss appears! What is your instinct?',
      options: [
        { text: 'Charge in head-first with my weapon drawn', scores: { warrior: 3, pirate: 1 } },
        { text: 'Analyze its weaknesses from a safe distance', scores: { magician: 3, bowman: 1 } },
        { text: 'Find high ground and attack from range', scores: { bowman: 3, thief: 1 } },
        { text: 'Sneak around and strike its blind spot', scores: { thief: 3, pirate: 1 } }
      ]
    },
    {
      question: 'Which area of Maple World appeals to you most?',
      options: [
        { text: 'Perion - the rugged warrior homeland', scores: { warrior: 3 } },
        { text: 'Ellinia - the magical forest', scores: { magician: 3 } },
        { text: 'Henesys - the peaceful hunting grounds', scores: { bowman: 3 } },
        { text: 'Kerning City - the underground streets', scores: { thief: 3 } }
      ]
    },
    {
      question: 'Your party is in trouble. What do you do?',
      options: [
        { text: 'Tank the damage and protect everyone', scores: { warrior: 3, pirate: 1 } },
        { text: 'Heal and buff the team', scores: { magician: 3 } },
        { text: 'Provide covering fire to create space', scores: { bowman: 3, pirate: 1 } },
        { text: 'Create a diversion so the party can escape', scores: { thief: 3 } }
      ]
    },
    {
      question: 'Which treasure would you choose?',
      options: [
        { text: 'An unbreakable legendary sword', scores: { warrior: 3 } },
        { text: 'An ancient tome of forbidden spells', scores: { magician: 3 } },
        { text: 'A bow blessed by the wind spirits', scores: { bowman: 3 } },
        { text: 'A pair of daggers that turn the user invisible', scores: { thief: 3 } }
      ]
    },
    {
      question: 'What motivates you as an adventurer?',
      options: [
        { text: 'Protecting the innocent and fighting evil', scores: { warrior: 3 } },
        { text: 'Uncovering the secrets of the universe', scores: { magician: 3 } },
        { text: 'Exploring every corner of the world', scores: { bowman: 2, pirate: 2 } },
        { text: 'Amassing wealth and living freely', scores: { thief: 2, pirate: 2 } }
      ]
    },
    {
      question: 'Pick a combat style:',
      options: [
        { text: 'Powerful, sweeping melee strikes', scores: { warrior: 3 } },
        { text: 'Devastating area-of-effect magic', scores: { magician: 3 } },
        { text: 'Precise long-range attacks', scores: { bowman: 3 } },
        { text: 'Quick combos and rapid movement', scores: { thief: 2, pirate: 2 } }
      ]
    },
    {
      question: 'You find a locked door blocking your path. How do you proceed?',
      options: [
        { text: 'Break it down with brute force', scores: { warrior: 3, pirate: 1 } },
        { text: 'Use magic to unlock or teleport past it', scores: { magician: 3 } },
        { text: 'Look for an alternate route around it', scores: { bowman: 2, thief: 1 } },
        { text: 'Pick the lock silently', scores: { thief: 3 } }
      ]
    },
    {
      question: 'Which companion would you want?',
      options: [
        { text: 'A loyal armored bear', scores: { warrior: 3 } },
        { text: 'A mystical dragon hatchling', scores: { magician: 3 } },
        { text: 'A sharp-eyed hawk', scores: { bowman: 3 } },
        { text: 'A mischievous monkey', scores: { pirate: 2, thief: 2 } }
      ]
    },
    {
      question: 'It is time to train. What do you focus on?',
      options: [
        { text: 'Strength and endurance', scores: { warrior: 3 } },
        { text: 'Intelligence and mana control', scores: { magician: 3 } },
        { text: 'Dexterity and aim', scores: { bowman: 3 } },
        { text: 'Agility and reflexes', scores: { thief: 2, pirate: 2 } }
      ]
    },
    {
      question: 'Final question: What is your dream in Maple World?',
      options: [
        { text: 'Become the strongest warrior in history', scores: { warrior: 3 } },
        { text: 'Master every spell and become an archmage', scores: { magician: 3 } },
        { text: 'Travel every world and map every region', scores: { bowman: 2, pirate: 2 } },
        { text: 'Build an empire from the shadows', scores: { thief: 3 } }
      ]
    }
  ];

  function init() {
    container = document.getElementById('panel-quiz');
    if (!container) return;

    container.innerHTML = '';
    resetQuiz();
    fetchQuestions();
  }

  function resetQuiz() {
    currentIndex = 0;
    scores = {};
    CLASS_TYPES.forEach(function (ct) { scores[ct] = 0; });
  }

  function fetchQuestions() {
    container.innerHTML =
      '<div style="text-align:center;padding:60px;color:#888;">Loading quiz...</div>';

    fetch('/api/quiz/questions')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        questions = data.questions || data || [];
        if (questions.length === 0) questions = FALLBACK_QUESTIONS;
        showQuestion();
      })
      .catch(function () {
        questions = FALLBACK_QUESTIONS;
        showQuestion();
      });
  }

  function showQuestion() {
    if (currentIndex >= questions.length) {
      showResult();
      return;
    }

    var q = questions[currentIndex];
    var progress = ((currentIndex) / questions.length) * 100;

    container.innerHTML =
      '<div style="max-width:640px;margin:0 auto;padding:24px;">' +
      // Progress bar
      '<div style="margin-bottom:24px;">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">' +
      '<span style="font-size:13px;color:#888;">Question ' + (currentIndex + 1) +
      ' of ' + questions.length + '</span>' +
      '<span style="font-size:13px;color:#888;">' + Math.round(progress) + '%</span>' +
      '</div>' +
      '<div style="width:100%;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">' +
      '<div style="width:' + progress + '%;height:100%;background:linear-gradient(90deg,#ffcc00,#ff9900);' +
      'border-radius:3px;transition:width 0.4s ease;"></div>' +
      '</div></div>' +
      // Question
      '<div style="background:#1a1a2e;border-radius:16px;padding:32px;' +
      'border:1px solid rgba(255,255,255,0.08);">' +
      '<h3 style="margin:0 0 24px 0;color:#fff;font-size:20px;line-height:1.5;text-align:center;">' +
      escapeHtml(q.question) + '</h3>' +
      '<div id="quiz-options" style="display:flex;flex-direction:column;gap:12px;"></div>' +
      '</div></div>';

    var optionsContainer = document.getElementById('quiz-options');
    q.options.forEach(function (opt, idx) {
      var btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.style.cssText =
        'padding:16px 20px;border:1px solid rgba(255,255,255,0.12);border-radius:12px;' +
        'background:rgba(0,0,0,0.2);color:#ddd;cursor:pointer;font-size:15px;text-align:left;' +
        'transition:all 0.2s;line-height:1.4;';
      btn.textContent = opt.text;

      btn.addEventListener('mouseenter', function () {
        btn.style.borderColor = 'rgba(255,204,0,0.4)';
        btn.style.background = 'rgba(255,204,0,0.08)';
        btn.style.color = '#fff';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.borderColor = 'rgba(255,255,255,0.12)';
        btn.style.background = 'rgba(0,0,0,0.2)';
        btn.style.color = '#ddd';
      });
      btn.addEventListener('click', function () {
        selectOption(opt);
      });

      optionsContainer.appendChild(btn);
    });
  }

  function selectOption(option) {
    if (option.scores) {
      Object.keys(option.scores).forEach(function (key) {
        scores[key] = (scores[key] || 0) + option.scores[key];
      });
    }
    currentIndex++;

    // Brief animation delay
    setTimeout(showQuestion, 200);
  }

  function showResult() {
    var topClass = CLASS_TYPES.reduce(function (best, ct) {
      return (scores[ct] || 0) > (scores[best] || 0) ? ct : best;
    }, CLASS_TYPES[0]);

    var info = CLASS_INFO[topClass];
    var totalScore = Object.values(scores).reduce(function (sum, v) { return sum + v; }, 0);

    // Build score bars sorted by score descending
    var sortedClasses = CLASS_TYPES.slice().sort(function (a, b) {
      return (scores[b] || 0) - (scores[a] || 0);
    });

    var scoreBarsHtml = sortedClasses.map(function (ct) {
      var ci = CLASS_INFO[ct];
      var pct = totalScore > 0 ? Math.round(((scores[ct] || 0) / totalScore) * 100) : 0;
      return '<div style="margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
        '<span style="font-size:13px;color:#ccc;">' + ci.name + ' (' + ci.name_ko + ')</span>' +
        '<span style="font-size:13px;color:#888;">' + pct + '%</span></div>' +
        '<div style="width:100%;height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">' +
        '<div style="width:' + pct + '%;height:100%;background:' + ci.color +
        ';border-radius:4px;transition:width 0.5s;"></div></div></div>';
    }).join('');

    container.innerHTML =
      '<div style="max-width:640px;margin:0 auto;padding:24px;">' +
      '<div style="background:#1a1a2e;border-radius:16px;padding:32px;text-align:center;' +
      'border:1px solid rgba(255,255,255,0.08);margin-bottom:20px;">' +
      '<div style="font-size:14px;color:#888;margin-bottom:8px;">Your recommended class is...</div>' +
      '<h2 style="margin:0;font-size:36px;color:' + info.color + ';">' +
      info.name + '</h2>' +
      '<div style="font-size:18px;color:#888;margin-bottom:20px;">' + info.name_ko + '</div>' +
      '<p style="color:#ccc;line-height:1.7;font-size:15px;max-width:500px;margin:0 auto 24px;">' +
      info.description + '</p>' +
      '<div style="text-align:left;max-width:400px;margin:0 auto;">' +
      scoreBarsHtml + '</div></div>' +
      // Matching jobs section
      '<div style="background:#1a1a2e;border-radius:16px;padding:24px;' +
      'border:1px solid rgba(255,255,255,0.08);margin-bottom:20px;">' +
      '<h3 style="margin:0 0 16px 0;color:#ffcc00;text-align:center;">Top Matching Jobs</h3>' +
      '<div id="quiz-matching-jobs" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));' +
      'gap:12px;"><div style="grid-column:1/-1;text-align:center;color:#888;">Loading jobs...</div></div></div>' +
      // Retake button
      '<div style="text-align:center;">' +
      '<button id="quiz-retake" style="padding:14px 36px;border:none;border-radius:12px;' +
      'background:linear-gradient(135deg,#ffcc00,#ff9900);color:#000;font-weight:700;' +
      'cursor:pointer;font-size:16px;transition:transform 0.2s;">Retake Quiz</button></div></div>';

    document.getElementById('quiz-retake').addEventListener('click', function () {
      resetQuiz();
      fetchQuestions();
    });

    var retakeBtn = document.getElementById('quiz-retake');
    retakeBtn.addEventListener('mouseenter', function () {
      retakeBtn.style.transform = 'scale(1.05)';
    });
    retakeBtn.addEventListener('mouseleave', function () {
      retakeBtn.style.transform = 'scale(1)';
    });

    fetchMatchingJobs(topClass);
  }

  function fetchMatchingJobs(classType) {
    var jobsContainer = document.getElementById('quiz-matching-jobs');
    if (!jobsContainer) return;

    fetch('/api/jobs?class_type=' + encodeURIComponent(classType))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var jobs = (data.jobs || data || []).slice(0, 3);
        if (jobs.length === 0) {
          jobsContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888;">' +
            'No matching jobs found.</div>';
          return;
        }
        var info = CLASS_INFO[classType];
        jobsContainer.innerHTML = jobs.map(function (job) {
          return '<div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:16px;' +
            'border:1px solid rgba(255,255,255,0.06);">' +
            '<div style="font-weight:600;color:#fff;font-size:14px;margin-bottom:4px;">' +
            escapeHtml(job.name) + '</div>' +
            (job.name_ko ? '<div style="font-size:11px;color:#888;margin-bottom:8px;">' +
              escapeHtml(job.name_ko) + '</div>' : '') +
            (job.description ? '<p style="margin:0;color:#aaa;font-size:12px;line-height:1.5;">' +
              escapeHtml(job.description).substring(0, 120) + '</p>' : '') +
            '</div>';
        }).join('');
      })
      .catch(function () {
        jobsContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888;">' +
          'Could not load matching jobs.</div>';
      });
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  window.Quiz = { init: init };
})();
