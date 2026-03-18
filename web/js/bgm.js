window.BGM = {
    loaded: false,
    allTracks: [],
    filteredTracks: [],
    activeCategory: 'all',
    activeEra: 'all',
    activeSort: 'nostalgia_rating',

    CATEGORY_ICONS: {
        login: "\u{1F3B5}",
        town: "\u{1F3E0}",
        field: "\u{1F333}",
        dungeon: "\u{1F5FF}",
        boss: "\u{1F480}",
        event: "\u{1F389}",
        ui: "\u{2699}\uFE0F"
    },

    CATEGORY_COLORS: {
        login: { bg: 'rgba(168,85,247,0.15)', color: '#a855f7' },
        town: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
        field: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
        dungeon: { bg: 'rgba(107,114,128,0.15)', color: '#6b7280' },
        boss: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
        event: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
        ui: { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af' }
    },

    ERA_COLORS: {
        classic: { bg: 'rgba(255,215,0,0.15)', color: '#FFD700' },
        post_bb: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
        arcane: { bg: 'rgba(168,85,247,0.15)', color: '#a855f7' },
        modern: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' }
    },

    MOOD_COLORS: {
        nostalgic: '#FFD700',
        peaceful: '#4ade80',
        adventurous: '#60a5fa',
        epic: '#f59e0b',
        dark: '#8b5cf6',
        cheerful: '#fb923c',
        mysterious: '#a78bfa'
    },

    async init() {
        if (this.loaded) return;
        var panel = document.getElementById('panel-bgm');
        panel.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            var data = await MapleApp.api('/api/bgm');
            this.allTracks = Array.isArray(data) ? data : (data.tracks || data.items || []);
        } catch (e) {
            this.allTracks = this.getFallbackData();
        }

        this.render(panel);
        this.loaded = true;
    },

    render(panel) {
        var self = this;
        panel.innerHTML = '';

        var filterBar = document.createElement('div');
        filterBar.style.cssText = 'display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.1);flex-wrap:wrap;background:rgba(0,0,0,0.2);';

        filterBar.innerHTML =
            '<div style="display:flex;align-items:center;gap:8px;">' +
            '<label style="font-size:13px;color:#a855f7;font-weight:600;">Category:</label>' +
            '<select id="bgm-category-filter" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(168,85,247,0.3);background:rgba(0,0,0,0.3);color:#fff;font-size:13px;outline:none;cursor:pointer;">' +
            '<option value="all">All</option>' +
            '<option value="login">Login</option>' +
            '<option value="town">Town</option>' +
            '<option value="field">Field</option>' +
            '<option value="dungeon">Dungeon</option>' +
            '<option value="boss">Boss</option>' +
            '<option value="event">Event</option>' +
            '<option value="ui">UI</option>' +
            '</select></div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
            '<label style="font-size:13px;color:#a855f7;font-weight:600;">Era:</label>' +
            '<select id="bgm-era-filter" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(168,85,247,0.3);background:rgba(0,0,0,0.3);color:#fff;font-size:13px;outline:none;cursor:pointer;">' +
            '<option value="all">All Eras</option>' +
            '<option value="classic">Classic</option>' +
            '<option value="post_bb">Post-Big Bang</option>' +
            '<option value="arcane">Arcane</option>' +
            '<option value="modern">Modern</option>' +
            '</select></div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
            '<label style="font-size:13px;color:#a855f7;font-weight:600;">Sort:</label>' +
            '<select id="bgm-sort" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(168,85,247,0.3);background:rgba(0,0,0,0.3);color:#fff;font-size:13px;outline:none;cursor:pointer;">' +
            '<option value="nostalgia_rating">Nostalgia Rating</option>' +
            '<option value="year">Year</option>' +
            '</select></div>' +
            '<span id="bgm-count" style="font-size:13px;color:#888;margin-left:auto;"></span>';

        panel.appendChild(filterBar);

        var grid = document.createElement('div');
        grid.id = 'bgm-grid';
        grid.style.cssText = 'padding:20px;overflow-y:auto;max-height:calc(100vh - 250px);display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;';
        panel.appendChild(grid);

        document.getElementById('bgm-category-filter').addEventListener('change', function (e) {
            self.activeCategory = e.target.value;
            self.applyFilters();
        });
        document.getElementById('bgm-era-filter').addEventListener('change', function (e) {
            self.activeEra = e.target.value;
            self.applyFilters();
        });
        document.getElementById('bgm-sort').addEventListener('change', function (e) {
            self.activeSort = e.target.value;
            self.applyFilters();
        });

        this.applyFilters();
    },

    applyFilters() {
        var self = this;
        var filtered = this.allTracks.slice();

        if (this.activeCategory !== 'all') {
            filtered = filtered.filter(function (t) { return t.category === self.activeCategory; });
        }
        if (this.activeEra !== 'all') {
            filtered = filtered.filter(function (t) { return t.era === self.activeEra; });
        }

        if (this.activeSort === 'nostalgia_rating') {
            filtered.sort(function (a, b) { return (b.nostalgia_rating || 0) - (a.nostalgia_rating || 0); });
        } else if (this.activeSort === 'year') {
            filtered.sort(function (a, b) { return (a.year || 0) - (b.year || 0); });
        }

        this.filteredTracks = filtered;
        this.renderCards();
    },

    renderCards() {
        var self = this;
        var grid = document.getElementById('bgm-grid');
        var countEl = document.getElementById('bgm-count');
        if (!grid) return;

        if (countEl) {
            countEl.textContent = this.filteredTracks.length + ' track' + (this.filteredTracks.length !== 1 ? 's' : '');
        }

        if (this.filteredTracks.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888;padding:60px;">No tracks found for the selected filters.</div>';
            return;
        }

        grid.innerHTML = this.filteredTracks.map(function (track, idx) {
            var catStyle = self.CATEGORY_COLORS[track.category] || self.CATEGORY_COLORS.town;
            var catIcon = self.CATEGORY_ICONS[track.category] || "\u{1F3B5}";
            var eraStyle = self.ERA_COLORS[track.era] || self.ERA_COLORS.classic;
            var moodColor = self.MOOD_COLORS[track.mood] || '#888';
            var notes = self.renderNotes(track.nostalgia_rating || 0);
            var ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(track.youtube_keyword || (track.name + ' MapleStory BGM'));

            return '<div class="bgm-card" data-idx="' + idx + '" style="background:linear-gradient(135deg,#0f0a1e,#1a1a2e);border-radius:12px;overflow:hidden;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;border:1px solid rgba(168,85,247,0.15);">' +
                '<div style="height:4px;background:linear-gradient(90deg,#a855f7,#3b82f6);"></div>' +
                '<div style="padding:18px;">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">' +
                '<h4 style="margin:0;color:#e2e8f0;font-size:15px;flex:1;margin-right:8px;">' + MapleApp.escapeHtml(track.name) + '</h4>' +
                '<span style="font-size:11px;padding:3px 10px;border-radius:10px;white-space:nowrap;background:' + catStyle.bg + ';color:' + catStyle.color + ';">' + catIcon + ' ' + MapleApp.escapeHtml(track.category || '') + '</span>' +
                '</div>' +
                (track.name_ko ? '<div style="font-size:12px;color:#7c3aed;margin-bottom:10px;">' + MapleApp.escapeHtml(track.name_ko) + '</div>' : '') +
                (track.location ? '<div style="font-size:12px;color:#888;margin-bottom:10px;">' + MapleApp.escapeHtml(track.location) + '</div>' : '') +
                '<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;">' +
                '<span style="font-size:11px;padding:2px 8px;border-radius:8px;background:' + eraStyle.bg + ';color:' + eraStyle.color + ';text-transform:capitalize;">' + MapleApp.escapeHtml((track.era || 'classic').replace('_', ' ')) + '</span>' +
                (track.mood ? '<span style="font-size:11px;padding:2px 8px;border-radius:8px;background:rgba(0,0,0,0.3);color:' + moodColor + ';border:1px solid ' + moodColor + '33;text-transform:capitalize;">' + MapleApp.escapeHtml(track.mood) + '</span>' : '') +
                '</div>' +
                '<div style="margin-bottom:12px;">' +
                '<div style="font-size:11px;color:#888;margin-bottom:4px;">Nostalgia</div>' +
                '<div style="font-size:14px;letter-spacing:2px;">' + notes + '</div>' +
                '</div>' +
                '<a href="' + MapleApp.escapeHtml(ytUrl) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;background:rgba(239,68,68,0.12);color:#ef4444;font-size:12px;font-weight:600;text-decoration:none;border:1px solid rgba(239,68,68,0.25);transition:background 0.2s;">&#9654; Search on YouTube</a>' +
                '</div></div>';
        }).join('');

        grid.querySelectorAll('.bgm-card').forEach(function (card) {
            card.addEventListener('mouseenter', function () {
                card.style.transform = 'translateY(-4px)';
                card.style.boxShadow = '0 8px 24px rgba(168,85,247,0.2)';
            });
            card.addEventListener('mouseleave', function () {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
            });
            card.addEventListener('click', function () {
                var idx = parseInt(card.getAttribute('data-idx'));
                var track = self.filteredTracks[idx];
                if (track) self.showDetail(track);
            });
        });
    },

    renderNotes(rating) {
        var full = Math.floor(rating);
        var half = rating % 1 >= 0.5 ? 1 : 0;
        var empty = 10 - full - half;
        var html = '';
        for (var i = 0; i < full; i++) html += '<span style="color:#a855f7;">&#9835;</span>';
        for (var j = 0; j < half; j++) html += '<span style="color:#a855f7;opacity:0.5;">&#9835;</span>';
        for (var k = 0; k < empty; k++) html += '<span style="color:#333;">&#9835;</span>';
        return html;
    },

    showDetail(track) {
        var catStyle = this.CATEGORY_COLORS[track.category] || this.CATEGORY_COLORS.town;
        var catIcon = this.CATEGORY_ICONS[track.category] || "\u{1F3B5}";
        var eraStyle = this.ERA_COLORS[track.era] || this.ERA_COLORS.classic;
        var moodColor = this.MOOD_COLORS[track.mood] || '#888';
        var notes = this.renderNotes(track.nostalgia_rating || 0);
        var ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(track.youtube_keyword || (track.name + ' MapleStory BGM'));

        var html =
            '<div style="border-bottom:4px solid #a855f7;padding:24px 28px 20px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">' +
            '<h2 style="margin:0;color:#e2e8f0;font-size:24px;">' + MapleApp.escapeHtml(track.name) + '</h2>' +
            '<span style="font-size:12px;padding:4px 14px;border-radius:12px;background:' + catStyle.bg + ';color:' + catStyle.color + ';white-space:nowrap;">' + catIcon + ' ' + MapleApp.escapeHtml(track.category || '') + '</span>' +
            '</div>' +
            (track.name_ko ? '<div style="font-size:15px;color:#7c3aed;margin-bottom:12px;">' + MapleApp.escapeHtml(track.name_ko) + '</div>' : '') +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">' +
            '<span style="font-size:12px;padding:3px 10px;border-radius:10px;background:' + eraStyle.bg + ';color:' + eraStyle.color + ';text-transform:capitalize;">' + MapleApp.escapeHtml((track.era || 'classic').replace('_', ' ')) + '</span>' +
            (track.mood ? '<span style="font-size:12px;padding:3px 10px;border-radius:10px;background:rgba(0,0,0,0.3);color:' + moodColor + ';border:1px solid ' + moodColor + '33;text-transform:capitalize;">' + MapleApp.escapeHtml(track.mood) + '</span>' : '') +
            '</div>' +
            '</div>' +
            '<div style="padding:20px 28px;">' +
            '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px;">' +
            this.buildStatBox('Location', track.location) +
            this.buildStatBox('Composer', track.composer) +
            this.buildStatBox('Duration', track.duration) +
            this.buildStatBox('Year', track.year) +
            '</div>' +
            '<div style="margin-bottom:16px;">' +
            '<div style="font-size:12px;color:#888;margin-bottom:6px;">Nostalgia Rating</div>' +
            '<div style="font-size:18px;letter-spacing:3px;">' + notes + '</div>' +
            '</div>' +
            (track.description_ko ? '<div style="margin-bottom:16px;">' +
                '<h4 style="margin:0 0 8px 0;color:#a855f7;font-size:15px;">Description (KR)</h4>' +
                '<p style="color:#ccc;line-height:1.7;font-size:14px;background:rgba(0,0,0,0.3);border-radius:8px;padding:14px;margin:0;">' + MapleApp.escapeHtml(track.description_ko) + '</p></div>' : '') +
            (track.description ? '<div style="margin-bottom:16px;">' +
                '<h4 style="margin:0 0 8px 0;color:#a855f7;font-size:15px;">Description (EN)</h4>' +
                '<p style="color:#ccc;line-height:1.7;font-size:14px;background:rgba(0,0,0,0.3);border-radius:8px;padding:14px;margin:0;">' + MapleApp.escapeHtml(track.description) + '</p></div>' : '') +
            '<div style="text-align:center;padding:16px 0;">' +
            '<a href="' + MapleApp.escapeHtml(ytUrl) + '" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;border-radius:10px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:15px;font-weight:600;text-decoration:none;transition:opacity 0.2s;">&#9654; Search on YouTube</a>' +
            '</div>' +
            '</div>';

        MapleApp.showModal(html);
    },

    buildStatBox(label, value) {
        return '<div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:12px;">' +
            '<div style="font-size:11px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">' + label + '</div>' +
            '<div style="font-size:16px;font-weight:600;color:#e2e8f0;">' + MapleApp.escapeHtml(String(value || '?')) + '</div></div>';
    },

    getFallbackData() {
        return [
            {
                name: "Login Theme", name_ko: "로그인 테마",
                category: "login", era: "classic", year: 2003,
                location: "Login Screen", composer: "Studio EIM",
                duration: "2:30", nostalgia_rating: 10, mood: "nostalgic",
                youtube_keyword: "MapleStory Login BGM Original",
                description_ko: "메이플스토리를 시작할 때 처음 듣게 되는 상징적인 로그인 음악.",
                description: "The iconic login screen music that every MapleStory player remembers. The opening notes instantly transport you back to 2003."
            },
            {
                name: "Lith Harbor", name_ko: "리스항구",
                category: "town", era: "classic", year: 2003,
                location: "Lith Harbor", composer: "Studio EIM",
                duration: "2:15", nostalgia_rating: 9, mood: "adventurous",
                youtube_keyword: "MapleStory Lith Harbor BGM",
                description_ko: "빅토리아 아일랜드의 관문, 리스항구의 활기찬 배경음악.",
                description: "The lively port town music that greeted every new adventurer arriving on Victoria Island."
            },
            {
                name: "Henesys", name_ko: "헤네시스",
                category: "town", era: "classic", year: 2003,
                location: "Henesys", composer: "Studio EIM",
                duration: "2:45", nostalgia_rating: 10, mood: "peaceful",
                youtube_keyword: "MapleStory Henesys BGM",
                description_ko: "버섯마을 헤네시스의 평화롭고 따뜻한 배경음악.",
                description: "The warm, peaceful melody of Henesys that became the soundtrack of countless hours of socializing and training."
            },
            {
                name: "Ellinia", name_ko: "엘리니아",
                category: "town", era: "classic", year: 2003,
                location: "Ellinia", composer: "Studio EIM",
                duration: "3:00", nostalgia_rating: 9, mood: "mysterious",
                youtube_keyword: "MapleStory Ellinia BGM",
                description_ko: "마법의 숲 엘리니아의 신비로운 배경음악.",
                description: "The mystical forest town music with enchanting melodies that perfectly captured the magical atmosphere of Ellinia."
            },
            {
                name: "Kerning City", name_ko: "커닝시티",
                category: "town", era: "classic", year: 2003,
                location: "Kerning City", composer: "Studio EIM",
                duration: "2:20", nostalgia_rating: 8, mood: "adventurous",
                youtube_keyword: "MapleStory Kerning City BGM",
                description_ko: "도적의 도시 커닝시티의 도시적이고 활동적인 배경음악.",
                description: "The urban, energetic beat of the thief city that made you feel like a street-savvy rogue."
            },
            {
                name: "Perion", name_ko: "페리온",
                category: "town", era: "classic", year: 2003,
                location: "Perion", composer: "Studio EIM",
                duration: "2:35", nostalgia_rating: 8, mood: "epic",
                youtube_keyword: "MapleStory Perion BGM",
                description_ko: "전사의 마을 페리온의 용맹한 배경음악.",
                description: "The bold, warrior-like theme of the rocky cliffs of Perion where fighters trained."
            },
            {
                name: "Ludibrium", name_ko: "루디브리엄",
                category: "town", era: "classic", year: 2004,
                location: "Ludibrium", composer: "Studio EIM",
                duration: "2:50", nostalgia_rating: 9, mood: "cheerful",
                youtube_keyword: "MapleStory Ludibrium BGM",
                description_ko: "장난감 나라 루디브리엄의 경쾌하고 즐거운 배경음악.",
                description: "The cheerful, toy-box melody of Ludibrium that perfectly matched its colorful, whimsical world of toys and blocks."
            },
            {
                name: "Aqua Road", name_ko: "아쿠아로드",
                category: "field", era: "classic", year: 2004,
                location: "Aqua Road", composer: "Studio EIM",
                duration: "3:10", nostalgia_rating: 7, mood: "peaceful",
                youtube_keyword: "MapleStory Aqua Road BGM",
                description_ko: "깊은 바닷속 아쿠아로드의 몽환적인 배경음악.",
                description: "The dreamy, underwater ambience of Aqua Road with its flowing, serene melodies."
            },
            {
                name: "Temple of Time", name_ko: "시간의 신전",
                category: "dungeon", era: "classic", year: 2007,
                location: "Temple of Time", composer: "Studio EIM",
                duration: "3:30", nostalgia_rating: 8, mood: "dark",
                youtube_keyword: "MapleStory Temple of Time BGM",
                description_ko: "시간의 신전에서 울려 퍼지는 장엄하고 어두운 배경음악.",
                description: "The solemn, dark atmosphere of the Temple of Time, where players confronted the legacy of the Black Mage."
            },
            {
                name: "Horntail's Cave", name_ko: "혼테일의 동굴",
                category: "boss", era: "classic", year: 2005,
                location: "Cave of Life", composer: "Studio EIM",
                duration: "2:55", nostalgia_rating: 8, mood: "epic",
                youtube_keyword: "MapleStory Horntail BGM",
                description_ko: "두 머리 용 혼테일과의 전투를 더욱 박진감 넘치게 만드는 전투 음악.",
                description: "The intense, adrenaline-pumping battle theme that accompanied the legendary Horntail fight."
            },
            {
                name: "Lachelein", name_ko: "레헬른",
                category: "town", era: "arcane", year: 2016,
                location: "Lachelein, the Dreaming City", composer: "Asteria",
                duration: "3:20", nostalgia_rating: 7, mood: "mysterious",
                youtube_keyword: "MapleStory Lachelein BGM",
                description_ko: "꿈의 도시 레헬른의 몽환적이고 아름다운 배경음악.",
                description: "The hauntingly beautiful waltz of the dreaming city Lachelein, where nightmares and beauty intertwine."
            },
            {
                name: "Cernium", name_ko: "세르니움",
                category: "field", era: "modern", year: 2021,
                location: "Cernium", composer: "Asteria",
                duration: "3:45", nostalgia_rating: 5, mood: "epic",
                youtube_keyword: "MapleStory Cernium BGM",
                description_ko: "신성한 도시 세르니움의 웅장한 전장 배경음악.",
                description: "The grand, orchestral theme of the holy city under siege, blending choir and strings for an epic atmosphere."
            },
            {
                name: "Black Mage Phase 1", name_ko: "검은 마법사 1페이즈",
                category: "boss", era: "arcane", year: 2018,
                location: "Tenebris: Labyrinth of Suffering", composer: "Asteria",
                duration: "4:15", nostalgia_rating: 9, mood: "epic",
                youtube_keyword: "MapleStory Black Mage BGM Phase 1",
                description_ko: "메이플스토리 최종 보스 검은 마법사와의 역사적인 전투 음악.",
                description: "The climactic battle theme for the ultimate showdown against the Black Mage, representing years of storytelling."
            },
            {
                name: "Christmas Event", name_ko: "크리스마스 이벤트",
                category: "event", era: "classic", year: 2004,
                location: "Various Event Maps", composer: "Studio EIM",
                duration: "2:00", nostalgia_rating: 7, mood: "cheerful",
                youtube_keyword: "MapleStory Christmas BGM",
                description_ko: "메이플스토리 크리스마스 이벤트의 축제 분위기 배경음악.",
                description: "The festive holiday music that transformed Maple World into a winter wonderland every December."
            }
        ];
    }
};
