/**
 * MapleStory Archive - Community Features
 * Guestbook, Board, and Votes sub-tabs
 */
(function () {
  'use strict';

  var SUBTABS = ['Guestbook', 'Board', 'Votes'];
  var activeSubTab = 'Guestbook';
  var container = null;
  var contentArea = null;

  var JOB_OPTIONS = [
    'Hero', 'Dark Knight', 'Paladin',
    'Arch Mage (F/P)', 'Arch Mage (I/L)', 'Bishop',
    'Bowmaster', 'Marksman', 'Pathfinder',
    'Night Lord', 'Shadower', 'Dual Blade',
    'Buccaneer', 'Corsair', 'Cannoneer',
    'Adele', 'Illium', 'Ark', 'Lara', 'Hoyoung'
  ];

  function init() {
    container = document.getElementById('panel-community');
    if (!container) return;

    container.innerHTML = '';
    buildSubTabs();
    contentArea = document.createElement('div');
    contentArea.id = 'community-content';
    contentArea.style.cssText = 'padding:20px;overflow-y:auto;max-height:calc(100vh - 250px);';
    container.appendChild(contentArea);
    renderSubTab();
  }

  function buildSubTabs() {
    var tabBar = document.createElement('div');
    tabBar.className = 'community-tabs';
    tabBar.style.cssText =
      'display:flex;gap:4px;padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.1);' +
      'background:rgba(0,0,0,0.2);';

    SUBTABS.forEach(function (tab) {
      var btn = document.createElement('button');
      btn.textContent = tab;
      btn.className = 'community-tab' + (tab === activeSubTab ? ' active' : '');
      btn.style.cssText =
        'padding:8px 20px;border:none;border-radius:8px 8px 0 0;cursor:pointer;font-size:14px;' +
        'transition:all 0.2s;color:#fff;' +
        'background:' + (tab === activeSubTab ? 'rgba(255,204,0,0.2)' : 'transparent') + ';' +
        'border-bottom:2px solid ' + (tab === activeSubTab ? '#ffcc00' : 'transparent') + ';';
      btn.addEventListener('click', function () {
        activeSubTab = tab;
        var allBtns = tabBar.querySelectorAll('.community-tab');
        allBtns.forEach(function (b) {
          var isActive = b.textContent === activeSubTab;
          b.className = 'community-tab' + (isActive ? ' active' : '');
          b.style.background = isActive ? 'rgba(255,204,0,0.2)' : 'transparent';
          b.style.borderBottom = '2px solid ' + (isActive ? '#ffcc00' : 'transparent');
        });
        renderSubTab();
      });
      tabBar.appendChild(btn);
    });

    container.appendChild(tabBar);
  }

  function renderSubTab() {
    if (!contentArea) return;
    contentArea.innerHTML = '';

    switch (activeSubTab) {
      case 'Guestbook':
        renderGuestbook();
        break;
      case 'Board':
        renderBoard();
        break;
      case 'Votes':
        renderVotes();
        break;
    }
  }

  // --- Guestbook ---

  function renderGuestbook() {
    var wrapper = document.createElement('div');

    var formHtml =
      '<div style="background:#1a1a2e;border-radius:12px;padding:20px;margin-bottom:24px;' +
      'border:1px solid rgba(255,255,255,0.08);">' +
      '<h3 style="margin:0 0 16px 0;color:#ffcc00;font-size:18px;">Leave a Message</h3>' +
      '<div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;">' +
      '<input id="gb-nickname" type="text" placeholder="Nickname" maxlength="20" ' +
      'style="flex:1;min-width:150px;padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);' +
      'background:rgba(0,0,0,0.3);color:#fff;font-size:14px;outline:none;" />' +
      '<select id="gb-job" style="flex:1;min-width:150px;padding:10px 14px;border-radius:8px;' +
      'border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.3);color:#fff;font-size:14px;outline:none;">' +
      '<option value="">Favorite Job (optional)</option>' +
      JOB_OPTIONS.map(function (j) { return '<option value="' + j + '">' + j + '</option>'; }).join('') +
      '</select>' +
      '</div>' +
      '<textarea id="gb-message" placeholder="Write your message..." rows="3" maxlength="500" ' +
      'style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);' +
      'background:rgba(0,0,0,0.3);color:#fff;font-size:14px;outline:none;resize:vertical;' +
      'box-sizing:border-box;"></textarea>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">' +
      '<span id="gb-status" style="font-size:13px;color:#888;"></span>' +
      '<button id="gb-submit" style="padding:10px 24px;border:none;border-radius:8px;' +
      'background:linear-gradient(135deg,#ffcc00,#ff9900);color:#000;font-weight:600;' +
      'cursor:pointer;font-size:14px;">Submit</button>' +
      '</div></div>';

    wrapper.innerHTML = formHtml +
      '<h3 style="color:#fff;margin-bottom:16px;">Recent Messages</h3>' +
      '<div id="gb-list" style="display:flex;flex-direction:column;gap:12px;">' +
      '<div style="text-align:center;color:#888;padding:20px;">Loading messages...</div></div>';

    contentArea.appendChild(wrapper);

    document.getElementById('gb-submit').addEventListener('click', submitGuestbook);
    loadGuestbookEntries();
  }

  function submitGuestbook() {
    var nickname = document.getElementById('gb-nickname').value.trim();
    var message = document.getElementById('gb-message').value.trim();
    var job = document.getElementById('gb-job').value;
    var status = document.getElementById('gb-status');

    if (!nickname || !message) {
      status.textContent = 'Please fill in nickname and message.';
      status.style.color = '#ff6666';
      return;
    }

    status.textContent = 'Sending...';
    status.style.color = '#888';

    fetch('/api/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: nickname, message: message, job_pick: job || '' })
    })
      .then(function (res) {
        if (res.status === 429) {
          throw new Error('Too many messages! Please wait a moment before posting again.');
        }
        if (!res.ok) throw new Error('Failed to post message.');
        return res.json();
      })
      .then(function () {
        status.textContent = 'Message posted!';
        status.style.color = '#66ff66';
        document.getElementById('gb-nickname').value = '';
        document.getElementById('gb-message').value = '';
        document.getElementById('gb-job').selectedIndex = 0;
        loadGuestbookEntries();
      })
      .catch(function (err) {
        status.textContent = err.message;
        status.style.color = '#ff6666';
      });
  }

  function loadGuestbookEntries() {
    var list = document.getElementById('gb-list');
    if (!list) return;

    fetch('/api/guestbook')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var entries = data.messages || data || [];
        if (entries.length === 0) {
          list.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">' +
            'No messages yet. Be the first to leave one!</div>';
          return;
        }
        list.innerHTML = entries.map(function (entry) {
          return '<div style="background:#1a1a2e;border-radius:10px;padding:16px;' +
            'border:1px solid rgba(255,255,255,0.06);">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '<span style="font-weight:600;color:#ffcc00;">' + escapeHtml(entry.nickname) + '</span>' +
            '<span style="font-size:12px;color:#666;">' + formatDate(entry.created_at) + '</span>' +
            '</div>' +
            '<p style="margin:0;color:#ccc;line-height:1.6;font-size:14px;">' +
            escapeHtml(entry.message) + '</p>' +
            (entry.job_pick ? '<div style="margin-top:8px;"><span style="font-size:11px;' +
              'padding:3px 8px;border-radius:10px;background:rgba(107,42,127,0.3);' +
              'color:#b05bd5;border:1px solid rgba(176,91,213,0.3);">' +
              escapeHtml(entry.job_pick) + '</span></div>' : '') +
            '</div>';
        }).join('');
      })
      .catch(function () {
        list.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">' +
          'Could not load messages. The server might be unavailable.</div>';
      });
  }

  // --- Board ---

  var currentPost = null;

  function renderBoard() {
    var wrapper = document.createElement('div');
    wrapper.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
      '<h3 style="margin:0;color:#fff;">Discussion Board</h3>' +
      '<button id="board-new-post-btn" style="padding:8px 18px;border:none;border-radius:8px;' +
      'background:linear-gradient(135deg,#ffcc00,#ff9900);color:#000;font-weight:600;' +
      'cursor:pointer;font-size:13px;">New Post</button>' +
      '</div>' +
      '<div id="board-content"></div>';

    contentArea.appendChild(wrapper);

    document.getElementById('board-new-post-btn').addEventListener('click', showNewPostForm);
    loadBoardPosts();
  }

  function loadBoardPosts() {
    var boardContent = document.getElementById('board-content');
    if (!boardContent) return;

    boardContent.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">Loading posts...</div>';

    fetch('/api/board/posts')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var posts = data.posts || data || [];
        if (posts.length === 0) {
          boardContent.innerHTML = '<div style="text-align:center;color:#888;padding:40px;">' +
            'No posts yet. Start a discussion!</div>';
          return;
        }
        boardContent.innerHTML = posts.map(function (post) {
          return '<div class="board-post-item" data-id="' + post.id + '" style="background:#1a1a2e;' +
            'border-radius:10px;padding:16px;margin-bottom:10px;cursor:pointer;' +
            'border:1px solid rgba(255,255,255,0.06);transition:border-color 0.2s;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
            '<div>' +
            '<h4 style="margin:0 0 6px 0;color:#fff;font-size:15px;">' + escapeHtml(post.title) + '</h4>' +
            '<span style="font-size:12px;color:#888;">by ' + escapeHtml(post.nickname) +
            ' &middot; ' + formatDate(post.created_at) + '</span>' +
            '</div>' +
            '<span style="font-size:12px;color:#666;white-space:nowrap;">' +
            (post.reply_count || 0) + ' replies</span>' +
            '</div></div>';
        }).join('');

        boardContent.querySelectorAll('.board-post-item').forEach(function (el) {
          el.addEventListener('mouseenter', function () {
            el.style.borderColor = 'rgba(255,204,0,0.3)';
          });
          el.addEventListener('mouseleave', function () {
            el.style.borderColor = 'rgba(255,255,255,0.06)';
          });
          el.addEventListener('click', function () {
            var postId = el.getAttribute('data-id');
            var post = posts.find(function (p) { return String(p.id) === postId; });
            if (post) showPostDetail(post);
          });
        });
      })
      .catch(function () {
        boardContent.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">' +
          'Could not load posts.</div>';
      });
  }

  function showNewPostForm() {
    var boardContent = document.getElementById('board-content');
    if (!boardContent) return;

    boardContent.innerHTML =
      '<div style="background:#1a1a2e;border-radius:12px;padding:20px;' +
      'border:1px solid rgba(255,255,255,0.08);">' +
      '<h4 style="margin:0 0 16px 0;color:#ffcc00;">Create New Post</h4>' +
      '<input id="post-author" type="text" placeholder="Your name" maxlength="30" ' +
      'style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);' +
      'background:rgba(0,0,0,0.3);color:#fff;font-size:14px;outline:none;margin-bottom:10px;' +
      'box-sizing:border-box;" />' +
      '<input id="post-title" type="text" placeholder="Post title" maxlength="100" ' +
      'style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);' +
      'background:rgba(0,0,0,0.3);color:#fff;font-size:14px;outline:none;margin-bottom:10px;' +
      'box-sizing:border-box;" />' +
      '<textarea id="post-body" placeholder="Write your post..." rows="5" maxlength="2000" ' +
      'style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);' +
      'background:rgba(0,0,0,0.3);color:#fff;font-size:14px;outline:none;resize:vertical;' +
      'box-sizing:border-box;"></textarea>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">' +
      '<span id="post-status" style="font-size:13px;color:#888;"></span>' +
      '<div style="display:flex;gap:8px;">' +
      '<button id="post-cancel" style="padding:10px 18px;border:1px solid rgba(255,255,255,0.2);' +
      'border-radius:8px;background:transparent;color:#fff;cursor:pointer;font-size:13px;">Cancel</button>' +
      '<button id="post-submit" style="padding:10px 24px;border:none;border-radius:8px;' +
      'background:linear-gradient(135deg,#ffcc00,#ff9900);color:#000;font-weight:600;' +
      'cursor:pointer;font-size:14px;">Post</button>' +
      '</div></div></div>';

    document.getElementById('post-cancel').addEventListener('click', loadBoardPosts);
    document.getElementById('post-submit').addEventListener('click', submitPost);
  }

  function submitPost() {
    var author = document.getElementById('post-author').value.trim();
    var title = document.getElementById('post-title').value.trim();
    var body = document.getElementById('post-body').value.trim();
    var status = document.getElementById('post-status');

    if (!author || !title || !body) {
      status.textContent = 'Please fill in all fields.';
      status.style.color = '#ff6666';
      return;
    }

    status.textContent = 'Posting...';
    status.style.color = '#888';

    fetch('/api/board/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: author, title: title, content: body })
    })
      .then(function (res) {
        if (res.status === 429) {
          throw new Error('You are posting too quickly. Please wait before trying again.');
        }
        if (!res.ok) throw new Error('Failed to create post.');
        return res.json();
      })
      .then(function () {
        loadBoardPosts();
      })
      .catch(function (err) {
        status.textContent = err.message;
        status.style.color = '#ff6666';
      });
  }

  function showPostDetail(post) {
    currentPost = post;
    var boardContent = document.getElementById('board-content');
    if (!boardContent) return;

    boardContent.innerHTML =
      '<button id="board-back-btn" style="padding:6px 14px;border:1px solid rgba(255,255,255,0.2);' +
      'border-radius:6px;background:transparent;color:#aaa;cursor:pointer;font-size:13px;' +
      'margin-bottom:16px;">&larr; Back to list</button>' +
      '<div style="background:#1a1a2e;border-radius:12px;padding:24px;' +
      'border:1px solid rgba(255,255,255,0.08);margin-bottom:20px;">' +
      '<h3 style="margin:0 0 8px 0;color:#fff;">' + escapeHtml(post.title) + '</h3>' +
      '<div style="font-size:13px;color:#888;margin-bottom:16px;">by ' +
      escapeHtml(post.nickname) + ' &middot; ' + formatDate(post.created_at) + '</div>' +
      '<p style="color:#ccc;line-height:1.7;">' + escapeHtml(post.content) + '</p>' +
      '</div>' +
      '<h4 style="color:#fff;margin-bottom:12px;">Replies</h4>' +
      '<div id="post-replies" style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">' +
      '<div style="text-align:center;color:#888;padding:12px;">Loading replies...</div></div>' +
      '<div style="background:#1a1a2e;border-radius:12px;padding:16px;' +
      'border:1px solid rgba(255,255,255,0.08);">' +
      '<h4 style="margin:0 0 12px 0;color:#ffcc00;font-size:15px;">Reply</h4>' +
      '<div style="display:flex;gap:10px;margin-bottom:10px;">' +
      '<input id="reply-author" type="text" placeholder="Your name" maxlength="30" ' +
      'style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);' +
      'background:rgba(0,0,0,0.3);color:#fff;font-size:13px;outline:none;" />' +
      '</div>' +
      '<textarea id="reply-body" placeholder="Write a reply..." rows="3" maxlength="1000" ' +
      'style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);' +
      'background:rgba(0,0,0,0.3);color:#fff;font-size:13px;outline:none;resize:vertical;' +
      'box-sizing:border-box;"></textarea>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">' +
      '<span id="reply-status" style="font-size:12px;color:#888;"></span>' +
      '<button id="reply-submit" style="padding:8px 20px;border:none;border-radius:8px;' +
      'background:linear-gradient(135deg,#ffcc00,#ff9900);color:#000;font-weight:600;' +
      'cursor:pointer;font-size:13px;">Reply</button>' +
      '</div></div>';

    document.getElementById('board-back-btn').addEventListener('click', loadBoardPosts);
    document.getElementById('reply-submit').addEventListener('click', submitReply);
    loadReplies(post.id);
  }

  function loadReplies(postId) {
    var repliesDiv = document.getElementById('post-replies');
    if (!repliesDiv) return;

    fetch('/api/board/posts/' + postId + '/replies')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var replies = data.replies || data || [];
        if (replies.length === 0) {
          repliesDiv.innerHTML = '<div style="text-align:center;color:#888;padding:12px;">' +
            'No replies yet.</div>';
          return;
        }
        repliesDiv.innerHTML = replies.map(function (reply) {
          return '<div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px;' +
            'border-left:3px solid rgba(255,204,0,0.3);">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">' +
            '<span style="font-weight:600;color:#ffcc00;font-size:13px;">' +
            escapeHtml(reply.nickname) + '</span>' +
            '<span style="font-size:11px;color:#666;">' + formatDate(reply.created_at) + '</span>' +
            '</div>' +
            '<p style="margin:0;color:#ccc;font-size:13px;line-height:1.5;">' +
            escapeHtml(reply.content) + '</p></div>';
        }).join('');
      })
      .catch(function () {
        repliesDiv.innerHTML = '<div style="text-align:center;color:#888;padding:12px;">' +
          'Could not load replies.</div>';
      });
  }

  function submitReply() {
    if (!currentPost) return;
    var author = document.getElementById('reply-author').value.trim();
    var body = document.getElementById('reply-body').value.trim();
    var status = document.getElementById('reply-status');

    if (!author || !body) {
      status.textContent = 'Please fill in all fields.';
      status.style.color = '#ff6666';
      return;
    }

    status.textContent = 'Sending...';
    status.style.color = '#888';

    fetch('/api/board/posts/' + currentPost.id + '/replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: author, content: body })
    })
      .then(function (res) {
        if (res.status === 429) {
          throw new Error('You are replying too fast. Please wait a moment.');
        }
        if (!res.ok) throw new Error('Failed to post reply.');
        return res.json();
      })
      .then(function () {
        document.getElementById('reply-author').value = '';
        document.getElementById('reply-body').value = '';
        status.textContent = 'Reply posted!';
        status.style.color = '#66ff66';
        loadReplies(currentPost.id);
      })
      .catch(function (err) {
        status.textContent = err.message;
        status.style.color = '#ff6666';
      });
  }

  // --- Votes ---

  function renderVotes() {
    var wrapper = document.createElement('div');
    wrapper.innerHTML =
      '<div style="text-align:center;margin-bottom:24px;">' +
      '<h3 style="color:#ffcc00;margin:0 0 8px 0;font-size:20px;">Vote for Your Favorite Job!</h3>' +
      '<p style="color:#888;font-size:14px;">Pick the job class you love the most.</p>' +
      '</div>' +
      '<div id="votes-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));' +
      'gap:12px;">' +
      '<div style="grid-column:1/-1;text-align:center;color:#888;padding:20px;">Loading jobs...</div></div>' +
      '<div id="votes-status" style="text-align:center;margin-top:16px;font-size:13px;color:#888;"></div>';

    contentArea.appendChild(wrapper);
    loadVoteData();
  }

  function loadVoteData() {
    var votesList = document.getElementById('votes-list');
    if (!votesList) return;

    Promise.all([
      fetch('/api/jobs').then(function (r) { return r.json(); }),
      fetch('/api/votes?item_type=job').then(function (r) { return r.json(); })
    ])
      .then(function (results) {
        var jobsData = results[0];
        var votesData = results[1];
        var jobs = jobsData.jobs || [];
        var votes = votesData.votes || [];

        var voteMap = {};
        votes.forEach(function (v) { voteMap[v.item_id] = v.votes; });

        var merged = jobs.map(function (job) {
          return {
            id: job.id,
            name: job.name || '',
            name_ko: job.name_ko || '',
            votes: voteMap[job.id] || 0
          };
        });

        merged.sort(function (a, b) { return (b.votes || 0) - (a.votes || 0); });
        renderVoteCards(merged);
      })
      .catch(function () {
        renderVoteCards(getDefaultVoteJobs());
      });
  }

  function getDefaultVoteJobs() {
    return [
      { id: 1, name: 'Hero', name_ko: '\ud788\uc5b4\ub85c', votes: 0 },
      { id: 2, name: 'Dark Knight', name_ko: '\ub2e4\ud06c\ub098\uc774\ud2b8', votes: 0 },
      { id: 3, name: 'Arch Mage (F/P)', name_ko: '\uc544\ud06c\uba54\uc774\uc9c0(\ubd88,\ub3c5)', votes: 0 },
      { id: 4, name: 'Bishop', name_ko: '\ube44\uc20d', votes: 0 },
      { id: 5, name: 'Bowmaster', name_ko: '\ubcf4\uc6b0\ub9c8\uc2a4\ud130', votes: 0 },
      { id: 6, name: 'Night Lord', name_ko: '\ub098\uc774\ud2b8\ub85c\ub4dc', votes: 0 },
      { id: 7, name: 'Shadower', name_ko: '\uc100\ub3c4\uc5b4', votes: 0 },
      { id: 8, name: 'Buccaneer', name_ko: '\ubc14\uc774\ud37c', votes: 0 },
      { id: 9, name: 'Corsair', name_ko: '\uce95\ud2b4', votes: 0 },
      { id: 10, name: 'Adele', name_ko: '\uc544\ub378', votes: 0 },
      { id: 11, name: 'Hoyoung', name_ko: '\ud638\uc601', votes: 0 },
      { id: 12, name: 'Lara', name_ko: '\ub77c\ub77c', votes: 0 }
    ];
  }

  function renderVoteCards(jobs) {
    var votesList = document.getElementById('votes-list');
    if (!votesList) return;

    var maxVotes = Math.max.apply(null, jobs.map(function (j) { return j.votes || 0; }).concat([1]));

    votesList.innerHTML = jobs.map(function (job) {
      var pct = maxVotes > 0 ? Math.round(((job.votes || 0) / maxVotes) * 100) : 0;
      return '<div class="vote-card" data-job-id="' + (job.id || job.name) + '" style="background:#1a1a2e;' +
        'border-radius:10px;padding:16px;border:1px solid rgba(255,255,255,0.08);' +
        'cursor:pointer;transition:all 0.2s;position:relative;overflow:hidden;">' +
        '<div style="position:absolute;bottom:0;left:0;width:' + pct + '%;height:3px;' +
        'background:linear-gradient(90deg,#ffcc00,#ff9900);transition:width 0.3s;"></div>' +
        '<div style="font-weight:600;color:#fff;font-size:14px;margin-bottom:2px;">' +
        escapeHtml(job.name) + '</div>' +
        '<div style="font-size:11px;color:#888;margin-bottom:8px;">' +
        escapeHtml(job.name_ko || '') + '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<span style="font-size:20px;font-weight:bold;color:#ffcc00;">' + (job.votes || 0) + '</span>' +
        '<button class="vote-btn" style="padding:6px 14px;border:none;border-radius:6px;' +
        'background:rgba(255,204,0,0.15);color:#ffcc00;cursor:pointer;font-size:12px;' +
        'font-weight:600;transition:background 0.2s;">Vote</button>' +
        '</div></div>';
    }).join('');

    votesList.querySelectorAll('.vote-card').forEach(function (card) {
      card.addEventListener('mouseenter', function () {
        card.style.borderColor = 'rgba(255,204,0,0.3)';
        card.style.transform = 'translateY(-2px)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.borderColor = 'rgba(255,255,255,0.08)';
        card.style.transform = 'translateY(0)';
      });

      var btn = card.querySelector('.vote-btn');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var jobId = card.getAttribute('data-job-id');
        castVote(jobId);
      });
    });
  }

  function castVote(jobId) {
    var statusEl = document.getElementById('votes-status');

    fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: 'job', item_id: parseInt(jobId) || 0 })
    })
      .then(function (res) {
        if (res.status === 429) {
          throw new Error('You have already voted recently. Please wait before voting again.');
        }
        if (!res.ok) throw new Error('Vote failed.');
        return res.json();
      })
      .then(function () {
        if (statusEl) {
          statusEl.textContent = 'Vote recorded! Thank you!';
          statusEl.style.color = '#66ff66';
        }
        loadVoteData();
      })
      .catch(function (err) {
        if (statusEl) {
          statusEl.textContent = err.message;
          statusEl.style.color = '#ff6666';
        }
      });
  }

  // --- Utilities ---

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      var d = new Date(dateStr);
      return d.toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  }

  window.Community = { init: init };
})();
