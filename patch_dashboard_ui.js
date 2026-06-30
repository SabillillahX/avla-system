const fs = require('fs');
const file = '../avla-backend/resources/views/admin/dashboard.blade.php';
let content = fs.readFileSync(file, 'utf8');

// 1. Update the HTML layout for the tab
const newTabHTML = `
            <!-- SECTION TEACHER APPLICATIONS -->
            <div id="tab-teacher-applications" class="tab-content hidden">
                <div class="header">
                    <h1>Pendaftaran Guru</h1>
                </div>

                <div class="grid-2">
                    <div class="card" style="grid-column: span 2;">
                        <h3 style="margin-bottom: 20px;">Daftar Pelamar (Teacher Applications)</h3>
                        <div id="teacher-app-msg" class="alert hidden"></div>
                        <div class="table-responsive">
                            <table id="teacher-apps-table">
                                <thead>
                                    <tr>
                                        <th>Pelamar</th>
                                        <th>Headline & Bio</th>
                                        <th>Keahlian</th>
                                        <th>Status</th>
                                        <th style="width: 150px; text-align: center;">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="5" style="text-align: center; color: #94a3b8;">Sedang memuat data...</td></tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Pagination Controls -->
                        <div class="pagination">
                            <span class="page-info" id="teacher-apps-page-info">Halaman 1 dari 1</span>
                            <button class="page-btn" id="teacher-apps-prev-btn" onclick="fetchTeacherApps(teacherAppsPage - 1)">Sebelumnya</button>
                            <button class="page-btn" id="teacher-apps-next-btn" onclick="fetchTeacherApps(teacherAppsPage + 1)">Selanjutnya</button>
                        </div>
                    </div>
                </div>
            </div>
`;
content = content.replace(
    /<!-- SECTION TEACHER APPLICATIONS -->[\s\S]*?(?=<!-- MAIN JAVASCRIPT LOGIC -->)/,
    newTabHTML + '\n'
);

// 2. Update the Javascript logic
const newJSHTML = `
        let teacherAppsPage = 1;
        async function fetchTeacherApps(page = 1) {
            if (page < 1) return;
            try {
                const res = await fetch(\`\${API_URL}/teacher-applications?page=\${page}\`, {
                    headers: { 'Authorization': \`Bearer \${token}\`, 'Accept': 'application/json' }
                });
                if (res.status === 401 || res.status === 403) return document.getElementById('logout-btn').click();

                const responseData = await res.json();
                const tableData = responseData.data;
                const tbody = document.querySelector('#teacher-apps-table tbody');
                tbody.innerHTML = '';

                teacherAppsPage = tableData.current_page;
                
                document.getElementById('teacher-apps-page-info').textContent = \`Menampilkan hal \${tableData.current_page} dari \${tableData.last_page || 1} (Total: \${tableData.total})\`;
                document.getElementById('teacher-apps-prev-btn').disabled = !tableData.prev_page_url;
                document.getElementById('teacher-apps-next-btn').disabled = !tableData.next_page_url;

                if (tableData.data && tableData.data.length > 0) {
                    tableData.data.forEach(app => {
                        let actions = '<span style="color:#94a3b8">-</span>';
                        if (app.status === 'pending') {
                            actions = \`
                                <div style="display:flex; gap:5px; justify-content:center;">
                                    <button class="mini-btn primary" onclick="approveTeacherApp('\${app.id}')">Approve</button>
                                    <button class="mini-btn" style="color:#dc2626; border-color:#dc2626;" onclick="rejectTeacherApp('\${app.id}')">Reject</button>
                                </div>
                            \`;
                        }
                        
                        let badgeClass = 'badge-status-pending';
                        if (app.status === 'approved') badgeClass = 'badge-status-completed';
                        if (app.status === 'rejected') badgeClass = 'badge-status-failed';
                        
                        let skillsHTML = '';
                        if (app.skills && Array.isArray(app.skills)) {
                            skillsHTML = app.skills.map(s => \`<span class="badge" style="background:#f1f5f9;color:#475569;margin-bottom:2px;">\${s}</span>\`).join(' ');
                        }

                        tbody.innerHTML += \`
                            <tr>
                                <td>
                                    <strong>\${app.user ? app.user.name : 'Unknown'}</strong><br/>
                                    <small style="color:#64748b;">\${app.user ? app.user.email : ''}</small>
                                </td>
                                <td>
                                    <strong>\${app.headline || '-'}</strong><br/>
                                    <small style="color:#64748b;">\${(app.bio || '').substring(0, 100)}...</small>
                                </td>
                                <td>
                                    <div style="display:flex; flex-wrap:wrap; gap:4px; max-width:200px;">
                                        \${skillsHTML}
                                    </div>
                                </td>
                                <td>
                                    <span class="badge \${badgeClass}">\${app.status.toUpperCase()}</span>
                                </td>
                                <td style="text-align: center;">\${actions}</td>
                            </tr>
                        \`;
                    });
                } else {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">Belum ada pendaftaran guru.</td></tr>';
                }
            } catch (err) {
                console.error(err);
            }
        }
        
        async function approveTeacherApp(id) {
            if(!confirm('Anda yakin ingin menyetujui pendaftar ini sebagai guru?')) return;
            try {
                const res = await fetch(\`\${API_URL}/teacher-applications/\${id}/approve\`, {
                    method: 'POST',
                    headers: { 'Authorization': \`Bearer \${token}\`, 'Accept': 'application/json' }
                });
                const data = await res.json();
                if(res.ok) {
                    alert('Berhasil disetujui!');
                    fetchTeacherApps(teacherAppsPage);
                } else {
                    alert(data.message || 'Error saat menyetujui');
                }
            } catch(e) {
                console.error(e);
            }
        }

        async function rejectTeacherApp(id) {
            const note = prompt('Alasan penolakan (opsional):');
            if(note === null) return;
            try {
                const res = await fetch(\`\${API_URL}/teacher-applications/\${id}/reject\`, {
                    method: 'POST',
                    headers: { 'Authorization': \`Bearer \${token}\`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
                    body: JSON.stringify({ review_note: note })
                });
                const data = await res.json();
                if(res.ok) {
                    alert('Berhasil ditolak!');
                    fetchTeacherApps(teacherAppsPage);
                } else {
                    alert(data.message || 'Error saat menolak');
                }
            } catch(e) {
                console.error(e);
            }
        }
`;

content = content.replace(
    /let teacherAppsPage = 1;[\s\S]*?(?=function checkAuth\(\) \{)/,
    newJSHTML + '\n        '
);

fs.writeFileSync(file, content);
