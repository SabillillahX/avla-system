const fs = require('fs');
const file = '../avla-backend/resources/views/admin/dashboard.blade.php';
let content = fs.readFileSync(file, 'utf8');

// 1. Add menu item
const menuItemHTML = `            <div class="menu-item" onclick="switchTab('teacher-applications')">
                Pendaftaran Guru
            </div>
`;
content = content.replace(
    /(<div class="menu-item" onclick="switchTab\('videos'\)">[\s\S]*?<\/div>)/,
    `$1\n${menuItemHTML}`
);

// 2. Add tab content
const tabContentHTML = `
            <!-- SECTION TEACHER APPLICATIONS -->
            <div id="tab-teacher-applications" class="tab-content hidden">
                <div class="header">
                    <h1>Pendaftaran Guru</h1>
                </div>

                <div class="card">
                    <h3 style="margin-bottom: 20px;">Daftar Pendaftaran Guru</h3>
                    <div class="table-responsive">
                        <table id="teacher-apps-table" class="data-table">
                            <thead>
                                <tr>
                                    <th>Pendaftar</th>
                                    <th>Headline</th>
                                    <th>Bio & Info</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="5">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
`;
content = content.replace(
    /(<!-- MAIN JAVASCRIPT LOGIC -->)/,
    `${tabContentHTML}\n$1`
);

// 3. Update switchTab
content = content.replace(
    /if \(tabId === 'videos'\) fetchVideos\(1\);/,
    `if (tabId === 'videos') fetchVideos(1);\n            if (tabId === 'teacher-applications') fetchTeacherApps(1);`
);

// 4. Add Javascript functions
const jsHTML = `
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

                if (tableData.data && tableData.data.length > 0) {
                    tableData.data.forEach(app => {
                        let actions = '-';
                        if (app.status === 'pending') {
                            actions = \`
                                <button class="btn btn-sm" style="background:#10b981;color:white;margin-bottom:5px;" onclick="approveTeacherApp('\${app.id}')">Approve</button>
                                <button class="btn btn-sm" style="background:#ef4444;color:white;" onclick="rejectTeacherApp('\${app.id}')">Reject</button>
                            \`;
                        }
                        
                        let badgeClass = 'badge-warning';
                        if (app.status === 'approved') badgeClass = 'badge-success';
                        if (app.status === 'rejected') badgeClass = 'badge-danger';

                        tbody.innerHTML += \`
                            <tr>
                                <td>
                                    <strong>\${app.user ? app.user.name : 'Unknown'}</strong><br/>
                                    <small>\${app.user ? app.user.email : ''}</small>
                                </td>
                                <td>\${app.headline || '-'}</td>
                                <td><small>\${(app.bio || '').substring(0, 50)}...</small></td>
                                <td>
                                    <span class="badge \${badgeClass}">\${app.status}</span>
                                </td>
                                <td>\${actions}</td>
                            </tr>
                        \`;
                    });
                } else {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Belum ada pendaftaran guru.</td></tr>';
                }
            } catch (err) {
                console.error(err);
            }
        }
        
        async function approveTeacherApp(id) {
            if(!confirm('Approve this application?')) return;
            try {
                const res = await fetch(\`\${API_URL}/teacher-applications/\${id}/approve\`, {
                    method: 'POST',
                    headers: { 'Authorization': \`Bearer \${token}\`, 'Accept': 'application/json' }
                });
                const data = await res.json();
                if(res.ok) {
                    alert('Approved successfully!');
                    fetchTeacherApps(teacherAppsPage);
                } else {
                    alert(data.message || 'Error approving');
                }
            } catch(e) {
                console.error(e);
            }
        }

        async function rejectTeacherApp(id) {
            const note = prompt('Alasan penolakan:');
            if(note === null) return;
            try {
                const res = await fetch(\`\${API_URL}/teacher-applications/\${id}/reject\`, {
                    method: 'POST',
                    headers: { 'Authorization': \`Bearer \${token}\`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
                    body: JSON.stringify({ review_note: note })
                });
                const data = await res.json();
                if(res.ok) {
                    alert('Rejected successfully!');
                    fetchTeacherApps(teacherAppsPage);
                } else {
                    alert(data.message || 'Error rejecting');
                }
            } catch(e) {
                console.error(e);
            }
        }
`;
content = content.replace(
    /(function checkAuth\(\) \{)/,
    `${jsHTML}\n        $1`
);

fs.writeFileSync(file, content);
