window.PartyQuest = {
    loaded: false,
    allPQs: [],
    filteredPQs: [],
    activeEra: 'all',
    activeStatus: 'all',
    activeSort: 'nostalgia_rating',

    STATUS_COLORS: {
        active: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'Active' },
        removed: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Removed' },
        revamped: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Revamped' }
    },

    ERA_COLORS: {
        classic: { bg: 'rgba(255,215,0,0.15)', color: '#FFD700' },
        modern: { bg: 'rgba(255,149,0,0.15)', color: '#FF9500' }
    },

    async init() {
        if (this.loaded) return;
        var panel = document.getElementById('panel-party-quest');
        panel.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            var data = await MapleApp.api('/api/party-quests');
            this.allPQs = Array.isArray(data) ? data : (data.party_quests || data.items || []);
        } catch (e) {
            this.allPQs = this.getFallbackData();
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
            '<label style="font-size:13px;color:#FF9500;font-weight:600;">Era:</label>' +
            '<select id="pq-era-filter" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(255,149,0,0.3);background:rgba(0,0,0,0.3);color:#fff;font-size:13px;outline:none;cursor:pointer;">' +
            '<option value="all">All Eras</option>' +
            '<option value="classic">Classic</option>' +
            '<option value="modern">Modern</option>' +
            '</select></div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
            '<label style="font-size:13px;color:#FF9500;font-weight:600;">Status:</label>' +
            '<select id="pq-status-filter" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(255,149,0,0.3);background:rgba(0,0,0,0.3);color:#fff;font-size:13px;outline:none;cursor:pointer;">' +
            '<option value="all">All Status</option>' +
            '<option value="active">Active</option>' +
            '<option value="removed">Removed</option>' +
            '<option value="revamped">Revamped</option>' +
            '</select></div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
            '<label style="font-size:13px;color:#FF9500;font-weight:600;">Sort:</label>' +
            '<select id="pq-sort" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(255,149,0,0.3);background:rgba(0,0,0,0.3);color:#fff;font-size:13px;outline:none;cursor:pointer;">' +
            '<option value="nostalgia_rating">Nostalgia Rating</option>' +
            '<option value="level_range">Level Range</option>' +
            '</select></div>' +
            '<span id="pq-count" style="font-size:13px;color:#888;margin-left:auto;"></span>';

        panel.appendChild(filterBar);

        var grid = document.createElement('div');
        grid.id = 'pq-grid';
        grid.style.cssText = 'padding:20px;overflow-y:auto;max-height:calc(100vh - 250px);display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;';
        panel.appendChild(grid);

        document.getElementById('pq-era-filter').addEventListener('change', function (e) {
            self.activeEra = e.target.value;
            self.applyFilters();
        });
        document.getElementById('pq-status-filter').addEventListener('change', function (e) {
            self.activeStatus = e.target.value;
            self.applyFilters();
        });
        document.getElementById('pq-sort').addEventListener('change', function (e) {
            self.activeSort = e.target.value;
            self.applyFilters();
        });

        this.applyFilters();
    },

    applyFilters() {
        var self = this;
        var filtered = this.allPQs.slice();

        if (this.activeEra !== 'all') {
            filtered = filtered.filter(function (pq) { return pq.era === self.activeEra; });
        }
        if (this.activeStatus !== 'all') {
            filtered = filtered.filter(function (pq) { return pq.status === self.activeStatus; });
        }

        if (this.activeSort === 'nostalgia_rating') {
            filtered.sort(function (a, b) { return (b.nostalgia_rating || 0) - (a.nostalgia_rating || 0); });
        } else if (this.activeSort === 'level_range') {
            filtered.sort(function (a, b) {
                var aMin = parseInt(String(a.level_range || '0').split('-')[0]) || 0;
                var bMin = parseInt(String(b.level_range || '0').split('-')[0]) || 0;
                return aMin - bMin;
            });
        }

        this.filteredPQs = filtered;
        this.renderCards();
    },

    renderCards() {
        var self = this;
        var grid = document.getElementById('pq-grid');
        var countEl = document.getElementById('pq-count');
        if (!grid) return;

        if (countEl) {
            countEl.textContent = this.filteredPQs.length + ' party quest' + (this.filteredPQs.length !== 1 ? 's' : '');
        }

        if (this.filteredPQs.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888;padding:60px;">No party quests found for the selected filters.</div>';
            return;
        }

        grid.innerHTML = this.filteredPQs.map(function (pq, idx) {
            var statusStyle = self.STATUS_COLORS[pq.status] || self.STATUS_COLORS.active;
            var eraStyle = self.ERA_COLORS[pq.era] || self.ERA_COLORS.classic;
            var stars = self.renderStars(pq.nostalgia_rating || 0);

            return '<div class="pq-card" data-idx="' + idx + '" style="background:linear-gradient(135deg,#1a1208,#1a1a2e);border-radius:12px;overflow:hidden;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;border:1px solid rgba(255,149,0,0.15);">' +
                '<div style="height:4px;background:linear-gradient(90deg,#FF9500,#FFD700);"></div>' +
                '<div style="padding:18px;">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">' +
                '<h4 style="margin:0;color:#FFD700;font-size:16px;">' + MapleApp.escapeHtml(pq.name) + '</h4>' +
                '<span style="font-size:11px;padding:3px 10px;border-radius:10px;white-space:nowrap;background:' + statusStyle.bg + ';color:' + statusStyle.color + ';font-weight:600;">' + MapleApp.escapeHtml(statusStyle.label) + '</span>' +
                '</div>' +
                (pq.name_ko ? '<div style="font-size:12px;color:#b8860b;margin-bottom:10px;">' + MapleApp.escapeHtml(pq.name_ko) + '</div>' : '') +
                '<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;">' +
                '<span style="font-size:11px;padding:2px 8px;border-radius:8px;background:' + eraStyle.bg + ';color:' + eraStyle.color + ';text-transform:capitalize;">' + MapleApp.escapeHtml(pq.era || 'classic') + '</span>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;font-size:12px;">' +
                '<div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:8px;">' +
                '<div style="color:#888;margin-bottom:2px;">Level Range</div>' +
                '<div style="color:#FFD700;font-weight:600;">' + MapleApp.escapeHtml(String(pq.level_range || '?')) + '</div></div>' +
                '<div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:8px;">' +
                '<div style="color:#888;margin-bottom:2px;">Party Size</div>' +
                '<div style="color:#FFD700;font-weight:600;">' + MapleApp.escapeHtml(String(pq.party_size || '?')) + '</div></div>' +
                '</div>' +
                '<div style="margin-bottom:10px;">' +
                '<div style="font-size:11px;color:#888;margin-bottom:4px;">Nostalgia Rating</div>' +
                '<div style="font-size:14px;letter-spacing:2px;">' + stars + '</div>' +
                '</div>' +
                (pq.description ? '<p style="margin:0;color:#ccc;font-size:12px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + MapleApp.escapeHtml(pq.description) + '</p>' : '') +
                '</div></div>';
        }).join('');

        grid.querySelectorAll('.pq-card').forEach(function (card) {
            card.addEventListener('mouseenter', function () {
                card.style.transform = 'translateY(-4px)';
                card.style.boxShadow = '0 8px 24px rgba(255,149,0,0.2)';
            });
            card.addEventListener('mouseleave', function () {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
            });
            card.addEventListener('click', function () {
                var idx = parseInt(card.getAttribute('data-idx'));
                var pq = self.filteredPQs[idx];
                if (pq) self.showDetail(pq);
            });
        });
    },

    renderStars(rating) {
        var full = Math.floor(rating);
        var half = rating % 1 >= 0.5 ? 1 : 0;
        var empty = 10 - full - half;
        var html = '';
        for (var i = 0; i < full; i++) html += '<span style="color:#FFD700;">&#9733;</span>';
        for (var j = 0; j < half; j++) html += '<span style="color:#FFD700;opacity:0.5;">&#9733;</span>';
        for (var k = 0; k < empty; k++) html += '<span style="color:#444;">&#9733;</span>';
        return html;
    },

    showDetail(pq) {
        var statusStyle = this.STATUS_COLORS[pq.status] || this.STATUS_COLORS.active;
        var eraStyle = this.ERA_COLORS[pq.era] || this.ERA_COLORS.classic;
        var stars = this.renderStars(pq.nostalgia_rating || 0);

        var html =
            '<div style="border-bottom:4px solid #FF9500;padding:24px 28px 20px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">' +
            '<h2 style="margin:0;color:#FFD700;font-size:24px;">' + MapleApp.escapeHtml(pq.name) + '</h2>' +
            '<span style="font-size:12px;padding:4px 14px;border-radius:12px;background:' + statusStyle.bg + ';color:' + statusStyle.color + ';font-weight:600;white-space:nowrap;">' + MapleApp.escapeHtml(statusStyle.label) + '</span>' +
            '</div>' +
            (pq.name_ko ? '<div style="font-size:15px;color:#b8860b;margin-bottom:12px;">' + MapleApp.escapeHtml(pq.name_ko) + '</div>' : '') +
            '<div style="display:flex;gap:8px;margin-bottom:16px;">' +
            '<span style="font-size:12px;padding:3px 10px;border-radius:10px;background:' + eraStyle.bg + ';color:' + eraStyle.color + ';text-transform:capitalize;">' + MapleApp.escapeHtml(pq.era || 'classic') + ' era</span>' +
            '</div>' +
            (pq.description ? '<p style="color:#ccc;line-height:1.7;font-size:14px;margin:0 0 16px 0;">' + MapleApp.escapeHtml(pq.description) + '</p>' : '') +
            '</div>' +
            '<div style="padding:20px 28px;">' +
            '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px;">' +
            this.buildStatBox('Level Range', pq.level_range) +
            this.buildStatBox('Party Size', pq.party_size) +
            this.buildStatBox('Stages', pq.stages_count) +
            this.buildStatBox('Final Boss', pq.final_boss) +
            '</div>' +
            '<div style="margin-bottom:16px;">' +
            '<div style="font-size:12px;color:#888;margin-bottom:6px;">Nostalgia Rating</div>' +
            '<div style="font-size:18px;letter-spacing:3px;">' + stars + '</div>' +
            '</div>' +
            (pq.rewards ? '<div style="margin-bottom:16px;">' +
                '<h4 style="margin:0 0 8px 0;color:#FF9500;font-size:15px;">Rewards</h4>' +
                '<div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:14px;color:#ccc;font-size:14px;line-height:1.6;">' + MapleApp.escapeHtml(pq.rewards) + '</div></div>' : '') +
            (pq.memorable_mechanic ? '<div style="margin-bottom:16px;">' +
                '<h4 style="margin:0 0 8px 0;color:#FF9500;font-size:15px;">Memorable Mechanic</h4>' +
                '<div style="background:rgba(255,149,0,0.08);border-radius:8px;padding:14px;color:#FFD700;font-size:14px;line-height:1.6;border-left:3px solid #FF9500;">' + MapleApp.escapeHtml(pq.memorable_mechanic) + '</div></div>' : '') +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">' +
            (pq.year_added ? '<div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:12px;"><div style="font-size:11px;color:#888;margin-bottom:4px;">Year Added</div><div style="color:#fff;font-weight:600;">' + MapleApp.escapeHtml(String(pq.year_added)) + '</div></div>' : '') +
            (pq.year_removed ? '<div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:12px;"><div style="font-size:11px;color:#888;margin-bottom:4px;">Year Removed</div><div style="color:#ef4444;font-weight:600;">' + MapleApp.escapeHtml(String(pq.year_removed)) + '</div></div>' : '') +
            '</div>' +
            (pq.community_impact ? '<div style="margin-bottom:16px;">' +
                '<h4 style="margin:0 0 8px 0;color:#FF9500;font-size:15px;">Community Impact</h4>' +
                '<div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:14px;color:#ccc;font-size:14px;line-height:1.7;font-style:italic;border-left:3px solid #FFD700;">' + MapleApp.escapeHtml(pq.community_impact) + '</div></div>' : '') +
            '</div>';

        MapleApp.showModal(html);
    },

    buildStatBox(label, value) {
        return '<div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:12px;">' +
            '<div style="font-size:11px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">' + label + '</div>' +
            '<div style="font-size:16px;font-weight:600;color:#FFD700;">' + MapleApp.escapeHtml(String(value || '?')) + '</div></div>';
    },

    getFallbackData() {
        return [
            {
                name: "Kerning City Party Quest", name_ko: "커닝시티 파티퀘스트",
                era: "classic", status: "revamped", level_range: "21-200", party_size: "3-4",
                nostalgia_rating: 10, description: "The original party quest that defined social gameplay in MapleStory. Navigate through stages of puzzles and teamwork.",
                stages_count: 5, final_boss: "King Slime", rewards: "Earrings, scrolls, EXP",
                memorable_mechanic: "The rope-jumping stage and finding the correct combination of portals through trial and error.",
                year_added: "2003", year_removed: null,
                community_impact: "KPQ was where friendships were forged. The phrase 'J>KPQ' became iconic in MapleStory culture."
            },
            {
                name: "Ludibrium Party Quest", name_ko: "루디브리엄 파티퀘스트",
                era: "classic", status: "revamped", level_range: "51-200", party_size: "3-6",
                nostalgia_rating: 9, description: "A multi-stage party quest set in the whimsical world of Ludibrium with challenging puzzles.",
                stages_count: 8, final_boss: "Alishar", rewards: "Necklace of Strength, scrolls, EXP",
                memorable_mechanic: "The box-pushing puzzle stage and the terrifying Alishar boss fight at the end.",
                year_added: "2004", year_removed: null,
                community_impact: "LPQ was the mid-level social hub. Players would spend hours finding parties and perfecting stage strategies."
            },
            {
                name: "Orbis Party Quest", name_ko: "오르비스 파티퀘스트",
                era: "classic", status: "removed", level_range: "51-70", party_size: "6",
                nostalgia_rating: 8, description: "Navigate the Garden of Goddess in Orbis Tower, solving puzzles to reach Papa Pixie.",
                stages_count: 6, final_boss: "Papa Pixie", rewards: "Orbis gear, scrolls",
                memorable_mechanic: "Collecting keys from different towers and the atmospheric garden setting.",
                year_added: "2004", year_removed: "2014",
                community_impact: "OPQ introduced more complex team coordination and was beloved for its unique fairy-tale atmosphere."
            },
            {
                name: "Magatia Party Quest", name_ko: "마가티아 파티퀘스트",
                era: "classic", status: "active", level_range: "71-200", party_size: "3-6",
                nostalgia_rating: 7, description: "Choose between Zenumist and Alcadno alchemist factions in the desert town of Magatia.",
                stages_count: 5, final_boss: "Rubian/Homunculus", rewards: "Pendants, alchemy materials",
                memorable_mechanic: "The faction choice system between two rival alchemist groups affected quest rewards.",
                year_added: "2007", year_removed: null,
                community_impact: "MPQ brought story-driven party content with faction rivalry that split friend groups."
            },
            {
                name: "Dragon Rider Party Quest", name_ko: "드래곤라이더 파티퀘스트",
                era: "modern", status: "active", level_range: "120-200", party_size: "3-6",
                nostalgia_rating: 5, description: "Battle through waves of enemies while riding dragons in Leafre.",
                stages_count: 3, final_boss: "Horntail Jr.", rewards: "Dragon Rider gear, EXP",
                memorable_mechanic: "The dragon-riding mechanic and aerial combat system.",
                year_added: "2012", year_removed: null,
                community_impact: "Introduced action-oriented party play that moved away from puzzle-based designs."
            },
            {
                name: "Romeo and Juliet Party Quest", name_ko: "로미오와 줄리엣 파티퀘스트",
                era: "classic", status: "active", level_range: "71-200", party_size: "2-6",
                nostalgia_rating: 8, description: "A love story unfolds in Magatia as you help two star-crossed lovers from rival factions.",
                stages_count: 5, final_boss: "Frankenroid", rewards: "Earrings, face accessories, EXP",
                memorable_mechanic: "The storytelling elements and the choice between Romeo and Juliet paths.",
                year_added: "2008", year_removed: null,
                community_impact: "RnJ PQ was the first truly narrative-driven party quest and became a favorite for couples playing together."
            },
            {
                name: "Chryse Party Quest", name_ko: "크리세 파티퀘스트",
                era: "modern", status: "removed", level_range: "60-200", party_size: "3-6",
                nostalgia_rating: 4, description: "Explore ancient Greek-themed ruins and battle mythological creatures.",
                stages_count: 4, final_boss: "Xerxes", rewards: "Ancient gear, scrolls",
                memorable_mechanic: "The mythology-inspired boss mechanics and gladiator arena stage.",
                year_added: "2011", year_removed: "2018",
                community_impact: "While short-lived, Chryse PQ introduced themed content that expanded MapleStory's world beyond its core fantasy."
            },
            {
                name: "Henesys Party Quest", name_ko: "헤네시스 파티퀘스트",
                era: "classic", status: "active", level_range: "10-200", party_size: "2-4",
                nostalgia_rating: 6, description: "Protect Henesys from waves of invading monsters in this beginner-friendly party quest.",
                stages_count: 4, final_boss: "Mushmom", rewards: "Beginner gear, EXP, potions",
                memorable_mechanic: "The tower defense-style gameplay protecting Moon Bunny while she makes rice cakes.",
                year_added: "2006", year_removed: null,
                community_impact: "HPQ was the gateway party quest for new players, teaching teamwork fundamentals."
            }
        ];
    }
};
