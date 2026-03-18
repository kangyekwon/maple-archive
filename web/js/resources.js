/**
 * Resources - External links and references
 */
window.Resources = {
    loaded: false,

    async init() {
        if (this.loaded) return;
        const panel = document.getElementById('panel-resources');
        panel.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            const data = await MapleApp.api('/api/external-resources');
            const categories = data.categories || [];

            if (categories.length === 0) {
                panel.innerHTML = `
                    <h2 style="margin-bottom:16px; color:var(--primary);">External Resources</h2>
                    <div class="card">
                        <div class="card-body" style="color:var(--text-dim);">
                            No external resources configured yet. Add them to data/external_resources.json.
                        </div>
                    </div>`;
                this.loaded = true;
                return;
            }

            let html = '<h2 style="margin-bottom:20px; color:var(--primary);"><i class="fas fa-external-link-alt"></i> External Resources</h2>';

            for (const cat of categories) {
                html += `<div class="card" style="margin-bottom:16px;">
                    <div class="card-title">${MapleApp.escapeHtml(cat.name)}</div>
                    ${cat.name_ko ? `<div class="card-subtitle">${MapleApp.escapeHtml(cat.name_ko)}</div>` : ''}
                    <div class="card-body">`;

                const links = cat.links || [];
                for (const link of links) {
                    html += `<div style="padding:8px 0; border-bottom:1px solid var(--border);">
                        <a href="${MapleApp.escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer"
                           style="color:var(--secondary); text-decoration:none; font-weight:600;">
                            <i class="fas fa-link"></i> ${MapleApp.escapeHtml(link.name)}
                        </a>
                        ${link.name_ko ? `<span style="color:var(--text-dim); margin-left:8px;">(${MapleApp.escapeHtml(link.name_ko)})</span>` : ''}
                        ${link.description ? `<div style="font-size:12px; color:var(--text-dim); margin-top:4px;">${MapleApp.escapeHtml(link.description)}</div>` : ''}
                    </div>`;
                }

                html += '</div></div>';
            }

            panel.innerHTML = html;
        } catch (e) {
            panel.innerHTML = '<div class="card"><div class="card-body" style="color:var(--danger);">Failed to load resources.</div></div>';
        }

        this.loaded = true;
    }
};
