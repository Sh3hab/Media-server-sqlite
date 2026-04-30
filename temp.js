

            const API_BASE = 'http://localhost:3000/api';
            let currentAdmin = null;
            let currentUpload = {
                callback: null,
                target: null,
                preview: null
            };

            function updateDateTime() {
                const now = new Date();
                const options = {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                };

                const timeElement = document.getElementById('current-time');
                if (timeElement) {
                    timeElement.textContent = now.toLocaleDateString('ar-SA', options);
                }
            }

            setInterval(updateDateTime, 1000);
            updateDateTime();


            document.getElementById('login-form').addEventListener('submit', async (e) => {
                e.preventDefault();

                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;

                try {
                    const response = await fetch(`${API_BASE}/admin/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ username, password })
                    });

                    const data = await response.json();

                    if (data.success) {
                        currentAdmin = data.admin;
                        localStorage.setItem('adminToken', data.token);
                        localStorage.setItem('adminData', JSON.stringify(data.admin));

                        document.getElementById('admin-name').textContent = data.admin.name || data.admin.username;
                        document.getElementById('admin-avatar').textContent = data.admin.name?.charAt(0) || data.admin.username.charAt(0);

                        document.getElementById('login-page').classList.add('hidden');
                        document.getElementById('admin-panel').classList.remove('hidden');

                        showAlert('تم تسجيل الدخول بنجاح', 'success');
                        loadDashboard();
                    } else {
                        document.getElementById('login-error').classList.remove('hidden');
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    document.getElementById('login-error').classList.remove('hidden');
                }
            });

            function logout() {
                if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
                    currentAdmin = null;
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminData');

                    document.getElementById('login-page').classList.remove('hidden');
                    document.getElementById('admin-panel').classList.add('hidden');

                    document.getElementById('username').value = '';
                    document.getElementById('password').value = '';
                    document.getElementById('login-error').classList.add('hidden');
                }
            }

    
            window.addEventListener('load', () => {
                const savedToken = localStorage.getItem('adminToken');
                const savedAdmin = localStorage.getItem('adminData');

                if (savedToken && savedAdmin) {
                    try {
                        currentAdmin = JSON.parse(savedAdmin);
                        document.getElementById('admin-name').textContent = currentAdmin.name || currentAdmin.username;
                        document.getElementById('admin-avatar').textContent = currentAdmin.name?.charAt(0) || currentAdmin.username.charAt(0);

                        document.getElementById('login-page').classList.add('hidden');
                        document.getElementById('admin-panel').classList.remove('hidden');

                        loadDashboard();
                    } catch (error) {
                        console.error('Error loading saved session:', error);
                        localStorage.clear();
                    }
                }
            });

            // ==========================================
            // 4. التنقل بين الأقسام
            // ==========================================
            function showSection(sectionId) {
                // إخفاء جميع الأقسام
                document.querySelectorAll('.section').forEach(section => {
                    section.classList.add('hidden');
                });

                // إظهار القسم المطلوب
                document.getElementById(`${sectionId}-section`).classList.remove('hidden');

                // تحديث القائمة النشطة
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                });

                const navItem = Array.from(document.querySelectorAll('.nav-item')).find(item =>
                    item.getAttribute('onclick')?.includes(`'${sectionId}'`)
                );

                if (navItem) {
                    navItem.classList.add('active');
                }

                // تحميل بيانات القسم
                switch (sectionId) {
                    case 'dashboard': loadDashboard(); break;
                    case 'series': loadSeries(); break;
                    case 'movies': loadMovies(); break;
                    case 'seasons': loadSeasons(); break;
                    case 'episodes': loadEpisodes(); break;
                    case 'parts': loadParts(); break;
                    case 'actors': loadActors(); break;
                    case 'actor-roles': loadActorRoles(); break;
                    case 'genres': loadGenres(); break;
                    case 'countries': loadCountries(); break;
                    case 'tags': loadTags(); break;
                    case 'promotions': loadPromotions(); break;
                    case 'files': loadFiles(); break;
                    case 'logs': loadLogs(); break;
                    case 'backup': loadBackupInfo(); break;
                }
            }

            // ==========================================
            // 5. تحميل البيانات
            // ==========================================
            async function loadDashboard() {
                try {
                    const [statsRes, logsRes] = await Promise.all([
                        fetch(`${API_BASE}/stats`, {
                            headers: {
                                'x-admin-token': localStorage.getItem('adminToken')
                            }
                        }),
                        fetch(`${API_BASE}/logs?limit=10`, {
                            headers: {
                                'x-admin-token': localStorage.getItem('adminToken')
                            }
                        })
                    ]);

                    const stats = await statsRes.json();
                    const logs = await logsRes.json();

                    // عرض الإحصائيات
                    const statsContainer = document.getElementById('stats-container');
                    if (statsContainer) {
                        statsContainer.innerHTML = `
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-film"></i>
                            </div>
                            <div class="stat-number">${stats.totalSeries || 0}</div>
                            <div class="stat-label">مسلسل</div>
                            <div class="stat-trend up">
                                <i class="fas fa-arrow-up"></i>
                                <span>5.2%</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-video"></i>
                            </div>
                            <div class="stat-number">${stats.totalMovies || 0}</div>
                            <div class="stat-label">فيلم</div>
                            <div class="stat-trend up">
                                <i class="fas fa-arrow-up"></i>
                                <span>3.8%</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-play-circle"></i>
                            </div>
                            <div class="stat-number">${stats.totalEpisodes || 0}</div>
                            <div class="stat-label">حلقة</div>
                            <div class="stat-trend up">
                                <i class="fas fa-arrow-up"></i>
                                <span>12.4%</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-number">${stats.totalActors || 0}</div>
                            <div class="stat-label">ممثل</div>
                            <div class="stat-trend up">
                                <i class="fas fa-arrow-up"></i>
                                <span>2.1%</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-eye"></i>
                            </div>
                            <div class="stat-number">${(stats.totalViews || 0).toLocaleString()}</div>
                            <div class="stat-label">مشاهدة</div>
                            <div class="stat-trend up">
                                <i class="fas fa-arrow-up"></i>
                                <span>18.7%</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-star"></i>
                            </div>
                            <div class="stat-number">${stats.totalPromoted || 0}</div>
                            <div class="stat-label">محتوى مميز</div>
                            <div class="stat-trend up">
                                <i class="fas fa-arrow-up"></i>
                                <span>7.3%</span>
                            </div>
                        </div>
                    `;
                    }

                    // عرض النشاط الأخير
                    const activityTable = document.querySelector('#recent-activity tbody');
                    if (activityTable) {
                        activityTable.innerHTML = logs.map(log => `
                        <tr>
                            <td>${new Date(log.timestamp).toLocaleString('ar-SA')}</td>
                            <td>
                                <span class="font-mono text-xs bg-gray-800 px-2 py-1 rounded">${log.method}</span>
                                <span class="mr-2">${log.endpoint}</span>
                            </td>
                            <td>${log.admin || 'غير معروف'}</td>
                            <td>${log.ip || 'غير معروف'}</td>
                        </tr>
                    `).join('');
                    }
                } catch (error) {
                    console.error('Error loading dashboard:', error);
                    showAlert('حدث خطأ في تحميل لوحة التحكم', 'error');
                }
            }

            async function loadSeries() {
                const loading = document.getElementById('series-loading');
                if (loading) loading.style.display = 'flex';

                try {
                    const response = await fetch(`${API_BASE}/series`);
                    const series = await response.json();

                    const tableBody = document.querySelector('#series-table tbody');
                    if (tableBody) {
                        tableBody.innerHTML = series.filter(s => !s.isMovie).map(item => `
                        <tr>
                            <td>
                                <img src="${item.poster || '/uploads/posters/default.jpg'}" 
                                     class="preview-image"
                                     onerror="this.src='/uploads/posters/default.jpg'">
                            </td>
                            <td>
                                <div class="font-bold text-white">${item.title}</div>
                                ${item.description ? `<div class="text-xs text-gray-500 mt-1">${item.description.substring(0, 60)}...</div>` : ''}
                            </td>
                            <td>${item.year || 'غير محدد'}</td>
                            <td>
                                <div class="flex items-center">
                                    <i class="fas fa-star text-yellow-500 mr-1"></i>
                                    <span>${item.rating || '0.0'}</span>
                                </div>
                            </td>
                            <td>${item.order || 0}</td>
                            <td>
                                <span class="status-badge ${item.promoted ? 'status-active' : 'status-inactive'}">
                                    ${item.promoted ? 'مميز' : 'عادي'}
                                </span>
                            </td>
                            <td>${(item.views || 0).toLocaleString()}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="action-btn btn-edit" onclick="editSeries('${item.id}')">
                                        <i class="fas fa-edit"></i>
                                        تعديل
                                    </button>
                                    <button class="action-btn btn-delete" onclick="deleteSeries('${item.id}', '${item.title}')">
                                        <i class="fas fa-trash"></i>
                                        حذف
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                    }

                    if (loading) loading.style.display = 'none';
                } catch (error) {
                    console.error('Error loading series:', error);
                    if (loading) loading.innerHTML = '<p class="text-danger">حدث خطأ في تحميل البيانات</p>';
                    showAlert('حدث خطأ في تحميل المسلسلات', 'error');
                }
            }

            async function loadMovies() {
                try {
                    const response = await fetch(`${API_BASE}/movies`);
                    const movies = await response.json();

                    const tableBody = document.querySelector('#movies-table tbody');
                    if (tableBody) {
                        tableBody.innerHTML = movies.map(item => `
                        <tr>
                            <td>
                                <img src="${item.poster || '/uploads/posters/default.jpg'}" 
                                     class="preview-image"
                                     onerror="this.src='/uploads/posters/default.jpg'">
                            </td>
                            <td>
                                <div class="font-bold text-white">${item.title}</div>
                            </td>
                            <td>${item.year || 'غير محدد'}</td>
                            <td>${item.duration ? `${item.duration} دقيقة` : 'غير محدد'}</td>
                            <td>${item.rating || '0.0'}</td>
                            <td>
                                <span class="status-badge ${item.promoted ? 'status-active' : 'status-inactive'}">
                                    ${item.promoted ? 'مميز' : 'عادي'}
                                </span>
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="action-btn btn-edit" onclick="editMovie('${item.id}')">
                                        <i class="fas fa-edit"></i>
                                        تعديل
                                    </button>
                                    <button class="action-btn btn-delete" onclick="deleteMovie('${item.id}', '${item.title}')">
                                        <i class="fas fa-trash"></i>
                                        حذف
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                    }
                } catch (error) {
                    console.error('Error loading movies:', error);
                    showAlert('حدث خطأ في تحميل الأفلام', 'error');
                }
            }

            async function loadSeasons() {
                try {
                    const response = await fetch(`${API_BASE}/seasons`);
                    const seasons = await response.json();

                    const tableBody = document.querySelector('#seasons-table tbody');
                    if (tableBody) {
                        tableBody.innerHTML = seasons.map(item => `
                        <tr>
                            <td>
                                <div class="font-bold">${item.seriesTitle || 'غير معروف'}</div>
                            </td>
                            <td>الموسم ${item.seasonNumber}</td>
                            <td>${item.title || `الموسم ${item.seasonNumber}`}</td>
                            <td>${item.year || 'غير محدد'}</td>
                            <td>${item.episodeCount || 0}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="action-btn btn-edit" onclick="editSeason('${item.id}')">
                                        <i class="fas fa-edit"></i>
                                        تعديل
                                    </button>
                                    <button class="action-btn btn-delete" onclick="deleteSeason('${item.id}', '${item.title}')">
                                        <i class="fas fa-trash"></i>
                                        حذف
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                    }
                } catch (error) {
                    console.error('Error loading seasons:', error);
                    showAlert('حدث خطأ في تحميل المواسم', 'error');
                }
            }

            async function loadEpisodes() {
                try {
                    const response = await fetch(`${API_BASE}/episodes`);
                    const episodes = await response.json();

                    const tableBody = document.querySelector('#episodes-table tbody');
                    if (tableBody) {
                        tableBody.innerHTML = episodes.map(item => `
                        <tr>
                            <td>الحلقة ${item.episodeNumber}</td>
                            <td>
                                <div class="font-bold">${item.title}</div>
                                ${item.description ? `<div class="text-xs text-gray-500 mt-1">${item.description.substring(0, 50)}...</div>` : ''}
                            </td>
                            <td>${item.seriesTitle || 'غير معروف'}</td>
                            <td>${item.seasonTitle || 'بدون'}</td>
                            <td>${item.duration || 'غير معروف'}</td>
                            <td>${(item.views || 0).toLocaleString()}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="action-btn btn-edit" onclick="editEpisode('${item.id}')">
                                        <i class="fas fa-edit"></i>
                                        تعديل
                                    </button>
                                    <button class="action-btn btn-delete" onclick="deleteEpisode('${item.id}', '${item.title}')">
                                        <i class="fas fa-trash"></i>
                                        حذف
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                    }
                } catch (error) {
                    console.error('Error loading episodes:', error);
                    showAlert('حدث خطأ في تحميل الحلقات', 'error');
                }
            }

            async function loadParts() {
                try {
                    const response = await fetch(`${API_BASE}/parts`);
                    const parts = await response.json();

                    // تحديث قائمة المحتويات للفلترة
                    const parentSelect = document.getElementById('parts-filter-parent');
                    if (parentSelect && parentSelect.options.length <= 1) {
                        const contentRes = await fetch(`${API_BASE}/series`);
                        const allContent = await contentRes.json();
                        parentSelect.innerHTML = '<option value="">جميع المحتويات</option>' +
                            allContent.map(c => `<option value="${c.id}">${c.title} (${c.isMovie ? 'فيلم' : 'مسلسل'})</option>`).join('');
                    }

                    // فلترة البيانات
                    const typeFilter = document.getElementById('parts-filter-type')?.value || 'all';
                    const parentFilter = document.getElementById('parts-filter-parent')?.value || '';

                    let filteredParts = parts;
                    if (typeFilter !== 'all') {
                        filteredParts = parts.filter(p => p.parentType === typeFilter);
                    }
                    if (parentFilter) {
                        filteredParts = filteredParts.filter(p => p.parentId === parentFilter);
                    }

                    const tableBody = document.querySelector('#parts-table tbody');
                    if (tableBody) {
                        tableBody.innerHTML = filteredParts.map(item => `
                        <tr>
                            <td>الجزء ${item.partNumber}</td>
                            <td>
                                <img src="${item.poster || item.parentPoster || '/uploads/posters/default.jpg'}" 
                                     class="preview-image"
                                     onerror="this.src='/uploads/posters/default.jpg'"
                                     title="${item.poster ? 'صورة الجزء' : 'صورة المحتوى الأصلي'}">
                            </td>
                            <td>
                                <div class="font-bold text-white">${item.title}</div>
                                ${item.description ? `<div class="text-xs text-gray-500 mt-1">${item.description.substring(0, 60)}...</div>` : ''}
                            </td>
                            <td>
                                <div class="font-bold">${item.parentTitle}</div>
                                <div class="text-xs text-gray-500">${item.parentType === 'movie' ? 'فيلم' : 'مسلسل'}</div>
                            </td>
                            <td>
                                <span class="status-badge ${item.parentType === 'movie' ? 'status-active' : 'status-inactive'}">
                                    ${item.parentType === 'movie' ? 'فيلم' : 'مسلسل'}
                                </span>
                            </td>
                            <td>${item.year || 'غير محدد'}</td>
                            <td>${(item.views || 0).toLocaleString()}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="action-btn btn-edit" onclick="editPart('${item.id}')">
                                        <i class="fas fa-edit"></i>
                                        تعديل
                                    </button>
                                    <button class="action-btn btn-delete" onclick="deletePart('${item.id}', '${item.title}')">
                                        <i class="fas fa-trash"></i>
                                        حذف
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                    }
                } catch (error) {
                    console.error('Error loading parts:', error);
                    showAlert('حدث خطأ في تحميل الأجزاء', 'error');
                }
            }

            async function loadActors() {
                try {
                    const response = await fetch(`${API_BASE}/actors`);
                    const actors = await response.json();

                    const tableBody = document.querySelector('#actors-table tbody');
                    if (tableBody) {
                        tableBody.innerHTML = actors.map(item => `
                        <tr>
                            <td>
                                <img src="${item.image || '/uploads/actors/default.jpg'}" 
                                     class="actor-image"
                                     onerror="this.src='/uploads/actors/default.jpg'">
                            </td>
                            <td>
                                <div class="font-bold text-white">${item.name}</div>
                                ${item.bio ? `<div class="text-xs text-gray-500 mt-1">${item.bio.substring(0, 80)}...</div>` : ''}
                            </td>
                            <td>${item.nationality || 'غير معروف'}</td>
                            <td>${item.birthDate ? new Date(item.birthDate).toLocaleDateString('ar-SA') : 'غير معروف'}</td>
                            <td>${((item.movies?.length || 0) + (item.series?.length || 0)) || 0}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="action-btn btn-edit" onclick="editActor('${item.id}')">
                                        <i class="fas fa-edit"></i>
                                        تعديل
                                    </button>
                                    <button class="action-btn btn-delete" onclick="deleteActor('${item.id}', '${item.name}')">
                                        <i class="fas fa-trash"></i>
                                        حذف
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                    }
                } catch (error) {
                    console.error('Error loading actors:', error);
                    showAlert('حدث خطأ في تحميل الممثلين', 'error');
                }
            }

            async function loadActorRoles() {
                const contentId = document.getElementById('content-select-actor')?.value;
                if (!contentId) {
                    const tableBody = document.querySelector('#actor-roles-table tbody');
                    if (tableBody) {
                        tableBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center py-8 text-gray-500">
                                اختر محتوى لعرض الممثلين المرتبطين به
                            </td>
                        </tr>
                    `;
                    }
                    return;
                }

                try {
                    const response = await fetch(`${API_BASE}/content/${contentId}/actors`);
                    const roles = await response.json();

                    const tableBody = document.querySelector('#actor-roles-table tbody');
                    if (tableBody) {
                        tableBody.innerHTML = roles.map(role => `
                        <tr>
                            <td>${role.order || 0}</td>
                            <td>
                                <img src="${role.actorImage || '/uploads/actors/default.jpg'}" 
                                     class="actor-image"
                                     onerror="this.src='/uploads/actors/default.jpg'">
                            </td>
                            <td>
                                <div class="font-bold text-white">${role.actorName}</div>
                                ${role.actorNationality ? `<div class="text-xs text-gray-500">${role.actorNationality}</div>` : ''}
                            </td>
                            <td>
                                <span class="status-badge ${role.role === 'ممثل رئيسي' ? 'status-active' : 'status-inactive'}">
                                    ${role.role}
                                </span>
                            </td>
                            <td>${role.characterName || role.actorName}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="action-btn btn-edit" onclick="editActorRole('${role.actorId}', '${contentId}')">
                                        <i class="fas fa-edit"></i>
                                        تعديل
                                    </button>
                                    <button class="action-btn btn-delete" onclick="deleteActorRole('${role.actorId}', '${contentId}', '${role.actorName}')">
                                        <i class="fas fa-trash"></i>
                                        حذف
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                    }
                } catch (error) {
                    console.error('Error loading actor roles:', error);
                    showAlert('حدث خطأ في تحميل أدوار الممثلين', 'error');
                }
            }

            async function loadGenres() {
                try {
                    const response = await fetch(`${API_BASE}/genres`);
                    const genres = await response.json();

                    const grid = document.getElementById('genres-grid');
                    if (grid) {
                        grid.innerHTML = genres.map(item => `
                        <div class="grid-item">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center gap-3">
                                    <div class="w-4 h-4 rounded-full" style="background-color: ${item.color || '#1bd68e'}"></div>
                                    <h3 class="font-bold text-white">${item.name}</h3>
                                </div>
                                <span class="text-xs text-gray-500">${item.count || 0} عمل</span>
                            </div>
                            ${item.icon ? `<div class="mb-3 text-center">
                                <i class="${item.icon} text-2xl" style="color: ${item.color || '#1bd68e'}"></i>
                            </div>` : ''}
                            <div class="flex justify-end gap-2">
                                <button class="action-btn btn-edit action-btn-sm" onclick="editGenre('${item.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn btn-delete action-btn-sm" onclick="deleteGenre('${item.id}', '${item.name}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('');
                    }
                } catch (error) {
                    console.error('Error loading genres:', error);
                    showAlert('حدث خطأ في تحميل التصنيفات', 'error');
                }
            }

            async function loadCountries() {
                try {
                    const response = await fetch(`${API_BASE}/countries`);
                    const countries = await response.json();

                    const grid = document.getElementById('countries-grid');
                    if (grid) {
                        grid.innerHTML = countries.map(item => `
                        <div class="grid-item">
                            <div class="flex items-center gap-3 mb-3">
                                ${item.flag ? `<img src="${item.flag}" class="w-8 h-6 object-cover rounded border" onerror="this.style.display='none'">` : ''}
                                <div>
                                    <h3 class="font-bold text-white">${item.name}</h3>
                                    ${item.continent ? `<p class="text-xs text-gray-500">${item.continent}</p>` : ''}
                                </div>
                            </div>
                            <div class="flex justify-end gap-2">
                                <button class="action-btn btn-edit action-btn-sm" onclick="editCountry('${item.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn btn-delete action-btn-sm" onclick="deleteCountry('${item.id}', '${item.name}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('');
                    }
                } catch (error) {
                    console.error('Error loading countries:', error);
                    showAlert('حدث خطأ في تحميل الدول', 'error');
                }
            }

            async function loadTags() {
                try {
                    const response = await fetch(`${API_BASE}/tags`);
                    const tags = await response.json();

                    const grid = document.getElementById('tags-grid');
                    if (grid) {
                        grid.innerHTML = tags.map(item => `
                        <div class="grid-item">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                    <div class="w-3 h-3 rounded-full" style="background-color: ${item.color || '#1bd68e'}"></div>
                                    <h3 class="font-bold text-white">${item.name}</h3>
                                </div>
                                <span class="text-xs text-gray-500">${item.count || 0} استخدام</span>
                            </div>
                            <div class="mb-3">
                                <span class="text-xs px-2 py-1 rounded-full ${getTagTypeClass(item.type)}">
                                    ${getTagTypeName(item.type)}
                                </span>
                            </div>
                            <div class="flex justify-end gap-2">
                                <button class="action-btn btn-edit action-btn-sm" onclick="editTag('${item.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn btn-delete action-btn-sm" onclick="deleteTag('${item.id}', '${item.name}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('');
                    }
                } catch (error) {
                    console.error('Error loading tags:', error);
                    showAlert('حدث خطأ في تحميل الوسوم', 'error');
                }
            }


            async function loadPromotions() {
                try {
                    const response = await fetch(`${API_BASE}/promoted`);
                    const promoted = await response.json();

                    const tableBody = document.querySelector('#promotions-table tbody');
                    if (tableBody) {
                        tableBody.innerHTML = promoted.map(item => `
                        <tr>
                            <td>
                                <div class="flex items-center gap-3">
                                    <img src="${item.poster || '/uploads/posters/default.jpg'}" 
                                         class="preview-image"
                                         onerror="this.src='/uploads/posters/default.jpg'">
                                    <div>
                                        <div class="font-bold text-white">${item.title}</div>
                                        <div class="text-xs text-gray-500">${item.isMovie ? 'فيلم' : 'مسلسل'}</div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="status-badge ${item.isMovie ? 'status-active' : 'status-inactive'}">
                                    ${item.isMovie ? 'فيلم' : 'مسلسل'}
                                </span>
                            </td>
                            <td>${item.order || 0}</td>
                            <td>${item.createdAt ? new Date(item.createdAt).toLocaleDateString('ar-SA') : 'غير معروف'}</td>
                            <td>${(item.views || 0).toLocaleString()}</td>
                            <td>
                                <button class="action-btn btn-delete" onclick="removePromotion('${item.id}')">
                                    <i class="fas fa-star"></i>
                                    إلغاء التميز
                                </button>
                            </td>
                        </tr>
                    `).join('');
                    }
                } catch (error) {
                    console.error('Error loading promotions:', error);
                    showAlert('حدث خطأ في تحميل المحتوى المميز', 'error');
                }
            }

            async function loadLogs() {
                try {
                    const response = await fetch(`${API_BASE}/logs`, {
                        headers: {
                            'x-admin-token': localStorage.getItem('adminToken')
                        }
                    });
                    const logs = await response.json();

                    const tableBody = document.querySelector('#logs-table tbody');
                    if (tableBody) {
                        tableBody.innerHTML = logs.map(log => `
                        <tr>
                            <td>${new Date(log.timestamp).toLocaleString('ar-SA')}</td>
                            <td>
                                <span class="font-mono text-xs bg-gray-800 px-2 py-1 rounded mr-2">${log.method}</span>
                                ${log.endpoint}
                            </td>
                            <td>${log.admin || 'غير معروف'}</td>
                            <td>${log.ip || 'غير معروف'}</td>
                            <td class="text-xs text-gray-500">${JSON.stringify(log.details || {}).substring(0, 80)}...</td>
                        </tr>
                    `).join('');
                    }
                } catch (error) {
                    console.error('Error loading logs:', error);
                    showAlert('حدث خطأ في تحميل السجلات', 'error');
                }
            }

            function loadBackupInfo() {
                // يمكن إضافة معلومات النسخ الاحتياطي هنا
            }

            // ==========================================
            // دوال إدارة الدول في النماذج
            // ==========================================
            let _countriesCache = null;

            async function loadCountriesIntoSelects() {
                if (_countriesCache) return _countriesCache;
                try {
                    const res = await fetch(`${API_BASE}/countries`);
                    _countriesCache = await res.json();
                } catch(e) { _countriesCache = []; }
                return _countriesCache;
            }

            async function populateCountrySelects() {
                const countries = await loadCountriesIntoSelects();
                const selects = ['series-countries-select', 'movie-countries-select', 'actor-nationality-select'];
                selects.forEach(id => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    if (id === 'actor-nationality-select') {
                        el.innerHTML = '<option value="">-- اختر الجنسية --</option>' +
                            countries.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
                    } else {
                        el.innerHTML = '<option value="">-- اختر دولة للإضافة --</option>' +
                            countries.map(c => `<option value="${c.name}">${c.name}${c.flag ? ' ' : ''}</option>`).join('');
                    }
                });
            }

            function getCountriesArray(inputId) {
                const val = document.getElementById(inputId)?.value;
                if (!val) return [];
                try { return JSON.parse(val); } catch(e) { return val.split(',').map(v => v.trim()).filter(Boolean); }
            }

            function saveCountriesArray(arr, inputId) {
                const el = document.getElementById(inputId);
                if (el) el.value = JSON.stringify(arr);
            }

            function renderCountryTags(arr, tagsContainerId, inputId) {
                const container = document.getElementById(tagsContainerId);
                if (!container) return;
                container.innerHTML = arr.map(c => `
                    <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
                          style="background:rgba(27,214,142,0.15); color:#1bd68e; border:1px solid rgba(27,214,142,0.3)">
                        ${c}
                        <button type="button" onclick="removeCountryTag('${c.replace(/'/g,"\\'")}','${tagsContainerId}','${inputId}')"
                                style="background:none;border:none;color:#1bd68e;cursor:pointer;font-size:14px;line-height:1;padding:0 2px">×</button>
                    </span>
                `).join('');
            }

            function addCountryToSeries(countryName, tagsContainerId, inputId) {
                if (!countryName) return;
                const arr = getCountriesArray(inputId);
                if (!arr.includes(countryName)) {
                    arr.push(countryName);
                    saveCountriesArray(arr, inputId);
                    renderCountryTags(arr, tagsContainerId, inputId);
                }
                const sel = document.querySelector(`select[onchange*="${tagsContainerId}"]`);
                if (sel) sel.value = '';
            }

            function removeCountryTag(countryName, tagsContainerId, inputId) {
                const arr = getCountriesArray(inputId).filter(c => c !== countryName);
                saveCountriesArray(arr, inputId);
                renderCountryTags(arr, tagsContainerId, inputId);
            }

            function syncCountriesText(inputEl, hiddenInputId, tagsContainerId) {
                const arr = inputEl.value.split(',').map(v => v.trim()).filter(Boolean);
                saveCountriesArray(arr, hiddenInputId);
                renderCountryTags(arr, tagsContainerId, hiddenInputId);
            }

            // ==========================================
            // 6. فتح المودالات
            // ==========================================
            function showAddSeriesModal() {
                resetModal('add-series-modal');
                document.getElementById('series-countries-tags').innerHTML = '';
                document.getElementById('series-countries-input').value = '[]';
                populateCountrySelects();
                document.getElementById('add-series-modal').style.display = 'flex';
            }

            function showAddMovieModal() {
                resetModal('add-movie-modal');
                document.getElementById('movie-countries-tags').innerHTML = '';
                document.getElementById('movie-countries-input').value = '[]';
                populateCountrySelects();
                document.getElementById('add-movie-modal').style.display = 'flex';
            }

            function showAddSeasonModal() {
                resetModal('add-season-modal');

                // تحميل قائمة المسلسلات
                fetch(`${API_BASE}/series`)
                    .then(res => res.json())
                    .then(series => {
                        const select = document.getElementById('season-series-select');
                        if (select) {
                            select.innerHTML = '<option value="">اختر المسلسل</option>' +
                                series.filter(s => !s.isMovie).map(s =>
                                    `<option value="${s.id}">${s.title}</option>`
                                ).join('');
                        }
                        document.getElementById('add-season-modal').style.display = 'flex';
                    })
                    .catch(error => {
                        console.error('Error loading series for season:', error);
                        showAlert('حدث خطأ في تحميل المسلسلات', 'error');
                    });
            }
            async function showAddEpisodeModal() {
                // 1. إعادة تهيئة النافذة
                resetModal('add-episode-modal');

                // 2. الحصول على التوكن (تأكد أن الاسم adminToken مطابق لما تستخدمه في تسجيل الدخول)
                const token = localStorage.getItem('adminToken');

                try {
                    console.log("محاولة جلب البيانات من:", API_BASE); // للديبرج

                    // 3. جلب المسلسلات والمواسم معاً
                    const [seriesRes, seasonsRes] = await Promise.all([
                        fetch(`${API_BASE}/series`, { headers: { 'x-admin-token': token } }),
                        fetch(`${API_BASE}/seasons`, { headers: { 'x-admin-token': token } })
                    ]);

                    // 4. فحص استجابة السيرفر
                    if (seriesRes.status === 401 || seasonsRes.status === 401) {
                        throw new Error('انتهت جلستك أو غير مصرح لك. يرجى تسجيل الخروج والدخول مجدداً.');
                    }

                    if (!seriesRes.ok || !seasonsRes.ok) {
                        throw new Error(`خطأ من السيرفر: المسلسلات (${seriesRes.status})، المواسم (${seasonsRes.status})`);
                    }

                    const series = await seriesRes.json();
                    const seasons = await seasonsRes.json();

                    // 5. التأكد من وجود العناصر في HTML قبل التعبئة (تجنباً للأخطاء)
                    const seriesSelect = document.getElementById('episode-series-select');
                    const seasonSelect = document.getElementById('episode-season-select');

                    if (!seriesSelect || !seasonSelect) {
                        throw new Error('خطأ في الـ HTML: لم يتم العثور على القوائم المنسدلة داخل الـ Modal');
                    }

                    // 6. تعبئة البيانات
                    seriesSelect.innerHTML = '<option value="">اختر المسلسل</option>' +
                        series.filter(s => !s.isMovie).map(s => `<option value="${s.id}">${s.title}</option>`).join('');

                    seasonSelect.innerHTML = '<option value="">اختر الموسم</option>' +
                        seasons.map(s => `<option value="${s.id}" data-series="${s.seriesId}">${s.title}</option>`).join('');

                    // 7. منطق التصفية التلقائية للمواسم
                    seriesSelect.onchange = function () {
                        const selectedSeriesId = this.value;
                        Array.from(seasonSelect.options).forEach(option => {
                            if (option.value === "") return;
                            option.style.display = option.dataset.series === selectedSeriesId ? "" : "none";
                        });
                        seasonSelect.value = "";
                    };

                    // 8. إظهار النافذة
                    document.getElementById('add-episode-modal').style.display = 'flex';

                } catch (error) {
                    console.error('فحص الخطأ بالتفصيل:', error);
                    showAlert(error.message, 'error');
                }
            }
            function showAddPartModal() {
                resetModal('add-part-modal');

                fetch(`${API_BASE}/series`)
                    .then(res => res.json())
                    .then(content => {
                        const select = document.getElementById('parent-select');
                        if (select) {
                            select.innerHTML = '<option value="">اختر مسلسل أو فيلم</option>' +
                                content.map(c => `<option value="${c.id}">${c.title} (${c.isMovie ? 'فيلم' : 'مسلسل'})</option>`).join('');
                        }
                        document.getElementById('add-part-modal').style.display = 'flex';
                    })
                    .catch(error => {
                        console.error('Error loading content for part:', error);
                        showAlert('حدث خطأ في تحميل المحتويات', 'error');
                    });
            }

            function showAddActorModal() {
                resetModal('add-actor-modal');
                populateCountrySelects();
                document.getElementById('add-actor-modal').style.display = 'flex';
            }

            function showAddActorRoleModal() {
                resetModal('add-actor-role-modal');

                Promise.all([
                    fetch(`${API_BASE}/series`),
                    fetch(`${API_BASE}/actors`)
                ])
                    .then(([contentRes, actorsRes]) => Promise.all([contentRes.json(), actorsRes.json()]))
                    .then(([content, actors]) => {
                        const contentSelect = document.getElementById('actor-content-select');
                        const actorSelect = document.getElementById('actor-select');

                        if (contentSelect) {
                            contentSelect.innerHTML = '<option value="">اختر مسلسل أو فيلم</option>' +
                                content.map(c => `<option value="${c.id}">${c.title} (${c.isMovie ? 'فيلم' : 'مسلسل'})</option>`).join('');
                        }

                        if (actorSelect) {
                            actorSelect.innerHTML = '<option value="">اختر ممثل</option>' +
                                actors.map(a => `<option value="${a.id}">${a.name} ${a.nationality ? `- ${a.nationality}` : ''}</option>`).join('');
                        }

                        document.getElementById('add-actor-role-modal').style.display = 'flex';
                    })
                    .catch(error => {
                        console.error('Error loading data for actor role:', error);
                        showAlert('حدث خطأ في تحميل البيانات', 'error');
                    });
            }

            function showAddGenreModal() {
                resetModal('add-genre-modal');
                document.getElementById('add-genre-modal').style.display = 'flex';
            }

            function showAddCountryModal() {
                resetModal('add-country-modal');
                document.getElementById('add-country-modal').style.display = 'flex';
            }

            function showAddTagModal() {
                resetModal('add-tag-modal');
                document.getElementById('add-tag-modal').style.display = 'flex';
            }

            function showTagContentModal() {
                resetModal('tag-content-modal');

                Promise.all([
                    fetch(`${API_BASE}/series`),
                    fetch(`${API_BASE}/tags`)
                ])
                    .then(([contentRes, tagsRes]) => Promise.all([contentRes.json(), tagsRes.json()]))
                    .then(([content, tags]) => {
                        const contentSelect = document.getElementById('tag-content-select');
                        const tagsChecklist = document.getElementById('tags-checklist');

                        if (contentSelect) {
                            contentSelect.innerHTML = '<option value="">اختر مسلسل أو فيلم</option>' +
                                content.map(c => `<option value="${c.id}">${c.title} (${c.isMovie ? 'فيلم' : 'مسلسل'})</option>`).join('');
                        }

                        if (tagsChecklist) {
                            tagsChecklist.innerHTML = tags.map(tag => `
                        <div class="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg mb-2">
                            <input type="checkbox" id="tag-${tag.id}" name="tagIds" value="${tag.id}" 
                                   class="rounded border-gray-700 bg-gray-900 text-primary focus:ring-primary">
                            <label for="tag-${tag.id}" class="flex items-center gap-3 cursor-pointer flex-1">
                                <div class="w-3 h-3 rounded-full" style="background-color: ${tag.color}"></div>
                                <span class="font-medium">${tag.name}</span>
                                <span class="text-xs text-gray-500 ml-auto">(${tag.count || 0} استخدام)</span>
                                
                            </label>
                        </div>
                    `).join('');
                        }

                        document.getElementById('tag-content-modal').style.display = 'flex';
                    })
                    .catch(error => {
                        console.error('Error loading data for tag content:', error);
                        showAlert('حدث خطأ في تحميل البيانات', 'error');
                    });
            }

            function showPromoteContentModal() {
                resetModal('promote-content-modal');

                fetch(`${API_BASE}/series`)
                    .then(res => res.json())
                    .then(content => {
                        const select = document.getElementById('promote-content-select');
                        if (select) {
                            select.innerHTML = '<option value="">اختر مسلسل أو فيلم</option>' +
                                content.filter(c => !c.promoted).map(c =>
                                    `<option value="${c.id}">${c.title} (${c.isMovie ? 'فيلم' : 'مسلسل'})</option>`
                                ).join('');
                        }
                        document.getElementById('promote-content-modal').style.display = 'flex';
                    })
                    .catch(error => {
                        console.error('Error loading content for promotion:', error);
                        showAlert('حدث خطأ في تحميل المحتويات', 'error');
                    });
            }

            // ==========================================
            // 7. معالجة النماذج
            // ==========================================
            document.getElementById('add-series-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();

                const form = e.target;
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                // تحويل البيانات
                data.promoted = data.promoted === 'on';
                data.genres = data.genres ? data.genres.split(',').map(g => g.trim()) : [];
                data.tags = data.tags ? data.tags.split(',').map(t => t.trim()) : [];
                data.isMovie = false;

                const isEdit = form.dataset.editId;
                const method = isEdit ? 'PUT' : 'POST';
                const url = isEdit ? `${API_BASE}/series/${isEdit}` : `${API_BASE}/series`;

                try {
                    const response = await fetch(url, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (result.success) {
                        showAlert(isEdit ? 'تم تحديث المسلسل بنجاح' : 'تم إضافة المسلسل بنجاح', 'success');
                        closeModal('add-series-modal');
                        resetModal('add-series-modal');
                        loadSeries();
                    } else {
                        showAlert(result.error || 'حدث خطأ', 'error');
                    }
                } catch (error) {
                    console.error('Error saving series:', error);
                    showAlert('حدث خطأ في الخادم', 'error');
                }
            });

            document.getElementById('add-movie-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();

                const form = e.target;
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                data.promoted = data.promoted === 'on';
                data.isMovie = true;

                const isEdit = form.dataset.editId;
                const method = isEdit ? 'PUT' : 'POST';
                const url = isEdit ? `${API_BASE}/series/${isEdit}` : `${API_BASE}/series`;

                try {
                    const response = await fetch(url, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (result.success) {
                        showAlert(isEdit ? 'تم تحديث الفيلم بنجاح' : 'تم إضافة الفيلم بنجاح', 'success');
                        closeModal('add-movie-modal');
                        resetModal('add-movie-modal');
                        loadMovies();
                    } else {
                        showAlert(result.error || 'حدث خطأ', 'error');
                    }
                } catch (error) {
                    console.error('Error saving movie:', error);
                    showAlert('حدث خطأ في الخادم', 'error');
                }
            });

            document.getElementById('add-season-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();

                const form = e.target;
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                try {
                    const response = await fetch(`${API_BASE}/seasons`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (result.success) {
                        showAlert('تم إضافة الموسم بنجاح', 'success');
                        closeModal('add-season-modal');
                        resetModal('add-season-modal');
                        loadSeasons();
                    } else {
                        showAlert(result.error || 'حدث خطأ', 'error');
                    }
                } catch (error) {
                    console.error('Error saving season:', error);
                    showAlert('حدث خطأ في الخادم', 'error');
                }
            });

            document.getElementById('add-episode-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();

                const form = e.target;
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                data.isFree = data.isFree === 'on';

                const isEdit = form.dataset.editId;
                const method = isEdit ? 'PUT' : 'POST';
                const url = isEdit ? `${API_BASE}/episodes/${isEdit}` : `${API_BASE}/episodes`;

                try {
                    const response = await fetch(url, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (result.success) {
                        showAlert(isEdit ? 'تم تحديث الحلقة بنجاح' : 'تم إضافة الحلقة بنجاح', 'success');
                        closeModal('add-episode-modal');
                        resetModal('add-episode-modal');
                        loadEpisodes();
                    } else {
                        showAlert(result.error || 'حدث خطأ', 'error');
                    }
                } catch (error) {
                    console.error('Error saving episode:', error);
                    showAlert('حدث خطأ في الخادم', 'error');
                }
            });

            document.getElementById('add-part-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();

                const form = e.target;
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                const isEdit = form.dataset.editId;
                const method = isEdit ? 'PUT' : 'POST';
                const url = isEdit ? `${API_BASE}/parts/${isEdit}` : `${API_BASE}/parts`;

                try {
                    const response = await fetch(url, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (result.success) {
                        showAlert(isEdit ? 'تم تحديث الجزء بنجاح' : 'تم إضافة الجزء بنجاح', 'success');
                        closeModal('add-part-modal');
                        resetModal('add-part-modal');
                        loadParts();
                    } else {
                        showAlert(result.error || 'حدث خطأ', 'error');
                    }
                } catch (error) {
                    console.error('Error saving part:', error);
                    showAlert('حدث خطأ في الخادم', 'error');
                }
            });

            document.getElementById('add-actor-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();

                const form = e.target;
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                const isEdit = form.dataset.editId;
                const method = isEdit ? 'PUT' : 'POST';
                const url = isEdit ? `${API_BASE}/actors/${isEdit}` : `${API_BASE}/actors`;

                try {
                    const response = await fetch(url, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (result.success) {
                        showAlert(isEdit ? 'تم تحديث الممثل بنجاح' : 'تم إضافة الممثل بنجاح', 'success');
                        closeModal('add-actor-modal');
                        resetModal('add-actor-modal');
                        loadActors();
                    } else {
                        showAlert(result.error || 'حدث خطأ', 'error');
                    }
                } catch (error) {
                    console.error('Error saving actor:', error);
                    showAlert('حدث خطأ في الخادم', 'error');
                }
            });

            document.getElementById('add-actor-role-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();

                const form = e.target;
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                try {
                    const response = await fetch(`${API_BASE}/content/${data.contentId}/actors`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (result.success) {
                        showAlert('تم ربط الممثل بالمحتوى بنجاح', 'success');
                        closeModal('add-actor-role-modal');
                        resetModal('add-actor-role-modal');

                        // تحديث قائمة المحتويات إذا كانت فارغة
                        const contentSelect = document.getElementById('content-select-actor');
                        if (contentSelect && contentSelect.options.length <= 1) {
                            const allContent = await fetch(`${API_BASE}/series`).then(r => r.json());
                            contentSelect.innerHTML = '<option value="">اختر محتوى</option>' +
                                allContent.map(c => `<option value="${c.id}">${c.title} (${c.isMovie ? 'فيلم' : 'مسلسل'})</option>`).join('');
                            contentSelect.value = data.contentId;
                            loadActorRoles();
                        }
                    } else {
                        showAlert(result.error || 'حدث خطأ', 'error');
                    }
                } catch (error) {
                    console.error('Error saving actor role:', error);
                    showAlert('حدث خطأ في الخادم', 'error');
                }
            });

            document.getElementById('add-genre-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();

                const form = e.target;
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                const isEdit = form.dataset.editId;
                const method = isEdit ? 'PUT' : 'POST';
                const url = isEdit ? `${API_BASE}/genres/${isEdit}` : `${API_BASE}/genres`;

                try {
                    const response = await fetch(url, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (result.success) {
                        showAlert(isEdit ? 'تم تحديث التصنيف بنجاح' : 'تم إضافة التصنيف بنجاح', 'success');
                        closeModal('add-genre-modal');
                        resetModal('add-genre-modal');
                        loadGenres();
                    } else {
                        showAlert(result.error || 'حدث خطأ', 'error');
                    }
                } catch (error) {
                    console.error('Error saving genre:', error);
                    showAlert('حدث خطأ في الخادم', 'error');
                }
            });

            document.getElementById('add-country-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();

                const form = e.target;
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                const isEdit = form.dataset.editId;
                const method = isEdit ? 'PUT' : 'POST';
                const url = isEdit ? `${API_BASE}/countries/${isEdit}` : `${API_BASE}/countries`;

                try {
                    const response = await fetch(url, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (result.success) {
                        showAlert(isEdit ? 'تم تحديث الدولة بنجاح' : 'تم إضافة الدولة بنجاح', 'success');
                        closeModal('add-country-modal');
                        resetModal('add-country-modal');
                        loadCountries();
                    } else {
                        showAlert(result.error || 'حدث خطأ', 'error');
                    }
                } catch (error) {
                    console.error('Error saving country:', error);
                    showAlert('حدث خطأ في الخادم', 'error');
                }
            });

            document.getElementById('add-tag-form').addEventListener('submit', async (e) => {
                e.preventDefault();

                const form = e.target;
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                const isEdit = form.dataset.editId;
                const method = isEdit ? 'PUT' : 'POST';
                const url = isEdit ? `${API_BASE}/tags/${isEdit}` : `${API_BASE}/tags`;

                try {
                    const response = await fetch(url, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (result.success) {
                        showAlert(isEdit ? 'تم تحديث الوسم بنجاح' : 'تم إضافة الوسم بنجاح', 'success');
                        closeModal('add-tag-modal');
                        resetModal('add-tag-modal');
                        loadTags();
                    } else {
                        showAlert(result.error || 'حدث خطأ', 'error');
                    }
                } catch (error) {
                    console.error('Error saving tag:', error);
                    showAlert('حدث خطأ في الخادم', 'error');
                }
            });



            document.getElementById('tag-content-form').addEventListener('submit', async (e) => {
                e.preventDefault();

                const form = e.target;
                const formData = new FormData(form);
                const data = {
                    contentId: formData.get('contentId'),
                    tagIds: Array.from(formData.getAll('tagIds'))
                };

                if (data.tagIds.length === 0) {
                    showAlert('يجب اختيار وسم واحد على الأقل', 'error');
                    return;
                }

                try {
                    const response = await fetch(`${API_BASE}/content/${data.contentId}/tags`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (result.success) {
                        showAlert('تم ربط الوسوم بنجاح', 'success');
                        closeModal('tag-content-modal');
                        resetModal('tag-content-modal');
                        loadTags();
                    } else {
                        showAlert(result.error || 'حدث خطأ في الربط', 'error');
                    }
                } catch (error) {
                    console.error('Error tagging content:', error);
                    showAlert('حدث خطأ في الخادم', 'error');
                }
            });

            document.getElementById('promote-content-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();

                const form = e.target;
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                try {
                    // تحديث المحتوى لجعله مميزاً
                    const contentRes = await fetch(`${API_BASE}/series/${data.contentId}`);
                    const content = await contentRes.json();

                    const updatedContent = {
                        ...content,
                        promoted: true,
                        order: parseInt(data.order) || 0
                    };

                    const response = await fetch(`${API_BASE}/series/${data.contentId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify(updatedContent)
                    });

                    const result = await response.json();

                    if (result.success) {
                        showAlert('تم تمييز المحتوى بنجاح', 'success');
                        closeModal('promote-content-modal');
                        resetModal('promote-content-modal');
                        loadPromotions();
                        loadSeries();
                        loadMovies();
                    } else {
                        showAlert(result.error || 'حدث خطأ', 'error');
                    }
                } catch (error) {
                    console.error('Error promoting content:', error);
                    showAlert('حدث خطأ في الخادم', 'error');
                }
            });








            // ==========================================
            // 8. دوال التعديل
            // ==========================================
            async function editSeries(id) {
                try {
                    const response = await fetch(`${API_BASE}/series/${id}`);
                    const series = await response.json();


                    const form = document.getElementById('add-series-form');
                    form.querySelector('[name="title"]').value = series.title;
                    form.querySelector('[name="year"]').value = series.year;
                    form.querySelector('[name="rating"]').value = series.rating || '';
                    form.querySelector('[name="order"]').value = series.order || 0;
                    form.querySelector('[name="director"]').value = series.director || '';
                    form.querySelector('[name="description"]').value = series.description || '';
                    form.querySelector('[name="genres"]').value = Array.isArray(series.genres) ? series.genres.join(', ') : '';
                    form.querySelector('[name="tags"]').value = Array.isArray(series.tags) ? series.tags.join(', ') : '';
                    form.querySelector('[name="promoted"]').checked = series.promoted || false;
                    form.querySelector('[name="language"]').value = series.language || 'ar';

                    // تعبئة حقل الدول
                    const seriesCountries = Array.isArray(series.countries) ? series.countries : [];
                    document.getElementById('series-countries-input').value = JSON.stringify(seriesCountries);
                    renderCountryTags(seriesCountries, 'series-countries-tags', 'series-countries-input');

                    if (series.poster && series.poster !== '/uploads/posters/default.jpg') {
                        document.getElementById('poster-url').value = series.poster;
                        const preview = document.getElementById('series-poster-preview');
                        preview.src = series.poster;
                        preview.classList.remove('hidden');
                    }

                    form.dataset.editId = id;
                    document.querySelector('#add-series-modal .modal-title').textContent = 'تعديل المسلسل';
                    document.querySelector('#add-series-form button[type="submit"]').textContent = 'تحديث المسلسل';

                    await populateCountrySelects();
                    document.getElementById('add-series-modal').style.display = 'flex';
                } catch (error) {
                    console.error('Error loading series for edit:', error);
                    showAlert('حدث خطأ في تحميل بيانات المسلسل', 'error');
                }
            }

            async function editMovie(id) {
                try {
                    const response = await fetch(`${API_BASE}/series/${id}`);
                    const movie = await response.json();

                    const form = document.getElementById('add-movie-form');
                    form.querySelector('[name="title"]').value = movie.title;
                    form.querySelector('[name="year"]').value = movie.year;
                    form.querySelector('[name="duration"]').value = movie.duration || '';
                    form.querySelector('[name="videoUrl"]').value = movie.videoUrl || '';
                    form.querySelector('[name="subtitleUrl"]').value = movie.subtitleUrl || '';
                    form.querySelector('[name="rating"]').value = movie.rating || '';
                    form.querySelector('[name="description"]').value = movie.description || '';
                    form.querySelector('[name="promoted"]').checked = movie.promoted || false;

                    // تعبئة حقل الدول
                    const movieCountries = Array.isArray(movie.countries) ? movie.countries : [];
                    document.getElementById('movie-countries-input').value = JSON.stringify(movieCountries);
                    renderCountryTags(movieCountries, 'movie-countries-tags', 'movie-countries-input');

                    if (movie.poster && movie.poster !== '/uploads/posters/default.jpg') {
                        document.getElementById('movie-poster-url').value = movie.poster;
                        const preview = document.getElementById('movie-poster-preview');
                        preview.src = movie.poster;
                        preview.classList.remove('hidden');
                    }

                    form.dataset.editId = id;
                    document.querySelector('#add-movie-modal .modal-title').textContent = 'تعديل الفيلم';
                    document.querySelector('#add-movie-form button[type="submit"]').textContent = 'تحديث الفيلم';

                    await populateCountrySelects();
                    document.getElementById('add-movie-modal').style.display = 'flex';
                } catch (error) {
                    console.error('Error loading movie for edit:', error);
                    showAlert('حدث خطأ في تحميل بيانات الفيلم', 'error');
                }
            }

            async function editSeason(id) {
                try {
                    const response = await fetch(`${API_BASE}/seasons/${id}`);
                    const season = await response.json();

                    // تحميل قائمة المسلسلات أولاً
                    const seriesRes = await fetch(`${API_BASE}/series`);
                    const series = await seriesRes.json();

                    const select = document.getElementById('season-series-select');
                    if (select) {
                        select.innerHTML = '<option value="">اختر المسلسل</option>' +
                            series.filter(s => !s.isMovie).map(s =>
                                `<option value="${s.id}" ${s.id === season.seriesId ? 'selected' : ''}>${s.title}</option>`
                            ).join('');
                    }

                    // تعبئة النموذج
                    const form = document.getElementById('add-season-form');
                    form.querySelector('[name="seasonNumber"]').value = season.seasonNumber;
                    form.querySelector('[name="title"]').value = season.title || '';
                    form.querySelector('[name="year"]').value = season.year || '';
                    form.querySelector('[name="description"]').value = season.description || '';

                    if (season.poster && season.poster !== season.seriesPoster) {
                        document.getElementById('season-poster-url').value = season.poster;
                        const preview = document.getElementById('season-poster-preview');
                        preview.src = season.poster;
                        preview.classList.remove('hidden');
                    }

                    form.dataset.editId = id;
                    document.querySelector('#add-season-modal .modal-title').textContent = 'تعديل الموسم';
                    document.querySelector('#add-season-form button[type="submit"]').textContent = 'تحديث الموسم';

                    document.getElementById('add-season-modal').style.display = 'flex';
                } catch (error) {
                    console.error('Error loading season for edit:', error);
                    showAlert('حدث خطأ في تحميل بيانات الموسم', 'error');
                }
            }

            async function editEpisode(id) {
                try {
                    const response = await fetch(`${API_BASE}/episodes/${id}`);
                    const episode = await response.json();

                    // تحميل البيانات
                    const [seriesRes, seasonsRes] = await Promise.all([
                        fetch(`${API_BASE}/series`),
                        fetch(`${API_BASE}/seasons`)
                    ]);
                    const [series, seasons] = await Promise.all([seriesRes.json(), seasonsRes.json()]);

                    const seriesSelect = document.getElementById('episode-series-select');
                    const seasonSelect = document.getElementById('episode-season-select');

                    if (seriesSelect) {
                        seriesSelect.innerHTML = '<option value="">اختر المسلسل</option>' +
                            series.filter(s => !s.isMovie).map(s =>
                                `<option value="${s.id}" ${s.id === episode.seriesId ? 'selected' : ''}>${s.title}</option>`
                            ).join('');
                    }

                    if (seasonSelect) {
                        seasonSelect.innerHTML = '<option value="">بدون موسم</option>' +
                            seasons.map(s =>
                                `<option value="${s.id}" data-series="${s.seriesId}" ${s.id === episode.seasonId ? 'selected' : ''}>
                                ${s.title} (${s.seriesTitle})
                            </option>`
                            ).join('');
                    }



                    const form = document.getElementById('add-episode-form');
                    form.querySelector('[name="episodeNumber"]').value = episode.episodeNumber;
                    form.querySelector('[name="title"]').value = episode.title;
                    form.querySelector('[name="description"]').value = episode.description || '';
                    form.querySelector('[name="isFree"]').checked = episode.isFree || false;

                    if (episode.videoUrl) {
                        document.getElementById('episode-video-url').value = episode.videoUrl;
                        document.getElementById('episode-video-info').classList.remove('hidden');
                    }

                    if (episode.subtitleUrl) {
                        document.getElementById('subtitle-url').value = episode.subtitleUrl;
                        document.getElementById('subtitle-info').classList.remove('hidden');
                    }

                    form.dataset.editId = id;
                    document.querySelector('#add-episode-modal .modal-title').textContent = 'تعديل الحلقة';
                    document.querySelector('#add-episode-form button[type="submit"]').textContent = 'تحديث الحلقة';

                    document.getElementById('add-episode-modal').style.display = 'flex';
                } catch (error) {
                    console.error('Error loading episode for edit:', error);
                    showAlert('حدث خطأ في تحميل بيانات الحلقة', 'error');
                }
            }

            async function editPart(id) {
                try {
                    const response = await fetch(`${API_BASE}/parts/${id}`);
                    const part = await response.json();

                    // تحميل قائمة المحتويات
                    const contentRes = await fetch(`${API_BASE}/series`);
                    const content = await contentRes.json();

                    const parentSelect = document.getElementById('parent-select');
                    if (parentSelect) {
                        parentSelect.innerHTML = '<option value="">اختر مسلسل أو فيلم</option>' +
                            content.map(c => `<option value="${c.id}" ${c.id === part.parentId ? 'selected' : ''}>${c.title} (${c.isMovie ? 'فيلم' : 'مسلسل'})</option>`).join('');
                    }

                    const form = document.getElementById('add-part-form');
                    form.querySelector('[name="partNumber"]').value = part.partNumber;
                    form.querySelector('[name="title"]').value = part.title;
                    form.querySelector('[name="year"]').value = part.year || '';
                    form.querySelector('[name="duration"]').value = part.duration || '';
                    form.querySelector('[name="description"]').value = part.description || '';
                    form.querySelector('[name="videoUrl"]').value = part.videoUrl || '';

                    if (part.poster && part.poster !== part.parentPoster) {
                        document.getElementById('part-poster-url').value = part.poster;
                        const preview = document.getElementById('part-poster-preview');
                        preview.src = part.poster;
                        preview.classList.remove('hidden');
                    }

                    form.dataset.editId = id;
                    document.querySelector('#add-part-modal .modal-title').textContent = 'تعديل الجزء';
                    document.querySelector('#add-part-form button[type="submit"]').textContent = 'تحديث الجزء';

                    document.getElementById('add-part-modal').style.display = 'flex';
                } catch (error) {
                    console.error('Error loading part for edit:', error);
                    showAlert('حدث خطأ في تحميل بيانات الجزء', 'error');
                }
            }

            async function editActor(id) {
                try {
                    const response = await fetch(`${API_BASE}/actors/${id}`);
                    const actor = await response.json();

                    const form = document.getElementById('add-actor-form');
                    form.querySelector('[name="name"]').value = actor.name;
                    form.querySelector('[name="nationality"]').value = actor.nationality || '';
                    form.querySelector('[name="birthDate"]').value = actor.birthDate ? actor.birthDate.split('T')[0] : '';
                    form.querySelector('[name="bio"]').value = actor.bio || '';

                    if (actor.image && actor.image !== '/uploads/actors/default.jpg') {
                        document.getElementById('actor-image-url').value = actor.image;
                        const preview = document.getElementById('actor-image-preview');
                        preview.src = actor.image;
                        preview.classList.remove('hidden');
                    }

                    form.dataset.editId = id;
                    document.querySelector('#add-actor-modal .modal-title').textContent = 'تعديل الممثل';
                    document.querySelector('#add-actor-form button[type="submit"]').textContent = 'تحديث الممثل';

                    document.getElementById('add-actor-modal').style.display = 'flex';
                } catch (error) {
                    console.error('Error loading actor for edit:', error);
                    showAlert('حدث خطأ في تحميل بيانات الممثل', 'error');
                }
            }

            async function editActorRole(actorId, contentId) {
                try {
                    const response = await fetch(`${API_BASE}/content/${contentId}/actors`);
                    const roles = await response.json();
                    const role = roles.find(r => r.actorId === actorId);

                    if (!role) {
                        showAlert('دور الممثل غير موجود', 'error');
                        return;
                    }

                    // تحميل البيانات
                    const [contentRes, actorsRes] = await Promise.all([
                        fetch(`${API_BASE}/series`),
                        fetch(`${API_BASE}/actors`)
                    ]);
                    const [content, actors] = await Promise.all([contentRes.json(), actorsRes.json()]);

                    const contentSelect = document.getElementById('actor-content-select');
                    const actorSelect = document.getElementById('actor-select');

                    if (contentSelect) {
                        contentSelect.innerHTML = '<option value="">اختر مسلسل أو فيلم</option>' +
                            content.map(c => `<option value="${c.id}" ${c.id === contentId ? 'selected' : ''}>${c.title} (${c.isMovie ? 'فيلم' : 'مسلسل'})</option>`).join('');
                    }

                    if (actorSelect) {
                        actorSelect.innerHTML = '<option value="">اختر ممثل</option>' +
                            actors.map(a => `<option value="${a.id}" ${a.id === actorId ? 'selected' : ''}>${a.name} ${a.nationality ? `- ${a.nationality}` : ''}</option>`).join('');
                    }

                    const form = document.getElementById('add-actor-role-form');
                    form.querySelector('[name="role"]').value = role.role;
                    form.querySelector('[name="characterName"]').value = role.characterName || '';
                    form.querySelector('[name="order"]').value = role.order || 0;

                    form.dataset.editId = `${actorId}-${contentId}`;
                    document.querySelector('#add-actor-role-modal .modal-title').textContent = 'تعديل دور الممثل';
                    document.querySelector('#add-actor-role-form button[type="submit"]').textContent = 'تحديث الدور';

                    document.getElementById('add-actor-role-modal').style.display = 'flex';
                } catch (error) {
                    console.error('Error loading actor role for edit:', error);
                    showAlert('حدث خطأ في تحميل بيانات دور الممثل', 'error');
                }
            }

            async function editGenre(id) {
                try {
                    const response = await fetch(`${API_BASE}/genres/${id}`);
                    const genre = await response.json();

                    const form = document.getElementById('add-genre-form');
                    form.querySelector('[name="name"]').value = genre.name;
                    form.querySelector('[name="color"]').value = genre.color || '#1bd68e';
                    form.querySelector('[name="colorText"]').value = genre.color || '#1bd68e';
                    form.querySelector('[name="icon"]').value = genre.icon || 'fa-tag';

                    form.dataset.editId = id;
                    document.querySelector('#add-genre-modal .modal-title').textContent = 'تعديل التصنيف';
                    document.querySelector('#add-genre-form button[type="submit"]').textContent = 'تحديث التصنيف';

                    document.getElementById('add-genre-modal').style.display = 'flex';
                } catch (error) {
                    console.error('Error loading genre for edit:', error);
                    showAlert('حدث خطأ في تحميل بيانات التصنيف', 'error');
                }
            }

            async function editCountry(id) {
                try {
                    const response = await fetch(`${API_BASE}/countries/${id}`);
                    const country = await response.json();

                    const form = document.getElementById('add-country-form');
                    form.querySelector('[name="name"]').value = country.name;
                    form.querySelector('[name="code"]').value = country.code || '';
                    form.querySelector('[name="continent"]').value = country.continent || '';
                    form.querySelector('[name="flag"]').value = country.flag || '';

                    if (country.flag) {
                        document.getElementById('flag-url').value = country.flag;
                        const preview = document.getElementById('flag-preview');
                        preview.src = country.flag;
                        preview.classList.remove('hidden');
                    }

                    form.dataset.editId = id;
                    document.querySelector('#add-country-modal .modal-title').textContent = 'تعديل الدولة';
                    document.querySelector('#add-country-form button[type="submit"]').textContent = 'تحديث الدولة';

                    document.getElementById('add-country-modal').style.display = 'flex';
                } catch (error) {
                    console.error('Error loading country for edit:', error);
                    showAlert('حدث خطأ في تحميل بيانات الدولة', 'error');
                }
            }

            async function editTag(id) {
                try {
                    const response = await fetch(`${API_BASE}/tags/${id}`);
                    const tag = await response.json();

                    const form = document.getElementById('add-tag-form');
                    form.querySelector('[name="name"]').value = tag.name;
                    form.querySelector('[name="color"]').value = tag.color || '#1bd68e';
                    form.querySelector('[name="colorText"]').value = tag.color || '#1bd68e';
                    form.querySelector('[name="type"]').value = tag.type || 'general';

                    form.dataset.editId = id;
                    document.querySelector('#add-tag-modal .modal-title').textContent = 'تعديل الوسم';
                    document.querySelector('#add-tag-form button[type="submit"]').textContent = 'تحديث الوسم';

                    document.getElementById('add-tag-modal').style.display = 'flex';
                } catch (error) {
                    console.error('Error loading tag for edit:', error);
                    showAlert('حدث خطأ في تحميل بيانات الوسم', 'error');
                }
            }

            // ==========================================
            // 9. دوال الحذف
            // ==========================================
            async function deleteSeries(id, title) {
                if (confirm(`هل أنت متأكد من حذف المسلسل "${title}"؟ سيتم حذف جميع المواسم والحلقات المرتبطة به.`)) {
                    try {
                        const response = await fetch(`${API_BASE}/series/${id}`, {
                            method: 'DELETE',
                            headers: {
                                'x-admin-token': localStorage.getItem('adminToken')
                            }
                        });

                        const result = await response.json();

                        if (result.success) {
                            showAlert('تم حذف المسلسل بنجاح', 'success');
                            loadSeries();
                        } else {
                            showAlert(result.error || 'حدث خطأ في الحذف', 'error');
                        }
                    } catch (error) {
                        console.error('Error deleting series:', error);
                        showAlert('حدث خطأ في الخادم', 'error');
                    }
                }
            }

            async function deleteMovie(id, title) {
                if (confirm(`هل أنت متأكد من حذف الفيلم "${title}"؟`)) {
                    try {
                        const response = await fetch(`${API_BASE}/series/${id}`, {
                            method: 'DELETE',
                            headers: {
                                'x-admin-token': localStorage.getItem('adminToken')
                            }
                        });

                        const result = await response.json();

                        if (result.success) {
                            showAlert('تم حذف الفيلم بنجاح', 'success');
                            loadMovies();
                        } else {
                            showAlert(result.error || 'حدث خطأ في الحذف', 'error');
                        }
                    } catch (error) {
                        console.error('Error deleting movie:', error);
                        showAlert('حدث خطأ في الخادم', 'error');
                    }
                }
            }

            async function deleteSeason(id, title) {
                if (confirm(`هل أنت متأكد من حذف الموسم "${title}"؟ سيتم حذف جميع الحلقات المرتبطة به.`)) {
                    try {
                        const response = await fetch(`${API_BASE}/seasons/${id}`, {
                            method: 'DELETE',
                            headers: {
                                'x-admin-token': localStorage.getItem('adminToken')
                            }
                        });

                        const result = await response.json();

                        if (result.success) {
                            showAlert('تم حذف الموسم بنجاح', 'success');
                            loadSeasons();
                        } else {
                            showAlert(result.error || 'حدث خطأ في الحذف', 'error');
                        }
                    } catch (error) {
                        console.error('Error deleting season:', error);
                        showAlert('حدث خطأ في الخادم', 'error');
                    }
                }
            }

            async function deleteEpisode(id, title) {
                if (confirm(`هل أنت متأكد من حذف الحلقة "${title}"؟`)) {
                    try {
                        const response = await fetch(`${API_BASE}/episodes/${id}`, {
                            method: 'DELETE',
                            headers: {
                                'x-admin-token': localStorage.getItem('adminToken')
                            }
                        });

                        const result = await response.json();

                        if (result.success) {
                            showAlert('تم حذف الحلقة بنجاح', 'success');
                            loadEpisodes();
                        } else {
                            showAlert(result.error || 'حدث خطأ في الحذف', 'error');
                        }
                    } catch (error) {
                        console.error('Error deleting episode:', error);
                        showAlert('حدث خطأ في الخادم', 'error');
                    }
                }
            }

            async function deletePart(id, title) {
                if (confirm(`هل أنت متأكد من حذف الجزء "${title}"؟`)) {
                    try {
                        const response = await fetch(`${API_BASE}/parts/${id}`, {
                            method: 'DELETE',
                            headers: {
                                'x-admin-token': localStorage.getItem('adminToken')
                            }
                        });

                        const result = await response.json();

                        if (result.success) {
                            showAlert('تم حذف الجزء بنجاح', 'success');
                            loadParts();
                        } else {
                            showAlert(result.error || 'حدث خطأ في الحذف', 'error');
                        }
                    } catch (error) {
                        console.error('Error deleting part:', error);
                        showAlert('حدث خطأ في الخادم', 'error');
                    }
                }
            }

            async function deleteActor(id, name) {
                if (confirm(`هل أنت متأكد من حذف الممثل "${name}"؟ سيتم حذفه من جميع الأعمال المرتبطة به.`)) {
                    try {
                        const response = await fetch(`${API_BASE}/actors/${id}`, {
                            method: 'DELETE',
                            headers: {
                                'x-admin-token': localStorage.getItem('adminToken')
                            }
                        });

                        const result = await response.json();

                        if (result.success) {
                            showAlert('تم حذف الممثل بنجاح', 'success');
                            loadActors();
                        } else {
                            showAlert(result.error || 'حدث خطأ في الحذف', 'error');
                        }
                    } catch (error) {
                        console.error('Error deleting actor:', error);
                        showAlert('حدث خطأ في الخادم', 'error');
                    }
                }
            }

            async function deleteActorRole(actorId, contentId, actorName) {
                if (confirm(`هل أنت متأكد من إزالة الممثل "${actorName}" من هذا المحتوى؟`)) {
                    try {
                        const response = await fetch(`${API_BASE}/content/${contentId}/actors/${actorId}`, {
                            method: 'DELETE',
                            headers: {
                                'x-admin-token': localStorage.getItem('adminToken')
                            }
                        });

                        const result = await response.json();

                        if (result.success) {
                            showAlert('تم إزالة الممثل بنجاح', 'success');
                            loadActorRoles();
                        } else {
                            showAlert(result.error || 'حدث خطأ في الإزالة', 'error');
                        }
                    } catch (error) {
                        console.error('Error deleting actor role:', error);
                        showAlert('حدث خطأ في الخادم', 'error');
                    }
                }
            }

            async function deleteGenre(id, name) {
                if (confirm(`هل أنت متأكد من حذف التصنيف "${name}"؟`)) {
                    try {
                        const response = await fetch(`${API_BASE}/genres/${id}`, {
                            method: 'DELETE',
                            headers: {
                                'x-admin-token': localStorage.getItem('adminToken')
                            }
                        });

                        const result = await response.json();

                        if (result.success) {
                            showAlert('تم حذف التصنيف بنجاح', 'success');
                            loadGenres();
                        } else {
                            showAlert(result.error || 'حدث خطأ في الحذف', 'error');
                        }
                    } catch (error) {
                        console.error('Error deleting genre:', error);
                        showAlert('حدث خطأ في الخادم', 'error');
                    }
                }
            }

            async function deleteCountry(id, name) {
                if (confirm(`هل أنت متأكد من حذف الدولة "${name}"؟`)) {
                    try {
                        const response = await fetch(`${API_BASE}/countries/${id}`, {
                            method: 'DELETE',
                            headers: {
                                'x-admin-token': localStorage.getItem('adminToken')
                            }
                        });

                        const result = await response.json();

                        if (result.success) {
                            showAlert('تم حذف الدولة بنجاح', 'success');
                            loadCountries();
                        } else {
                            showAlert(result.error || 'حدث خطأ في الحذف', 'error');
                        }
                    } catch (error) {
                        console.error('Error deleting country:', error);
                        showAlert('حدث خطأ في الخادم', 'error');
                    }
                }
            }

            async function deleteTag(id, name) {
                if (confirm(`هل أنت متأكد من حذف الوسم "${name}"؟`)) {
                    try {
                        const response = await fetch(`${API_BASE}/tags/${id}`, {
                            method: 'DELETE',
                            headers: {
                                'x-admin-token': localStorage.getItem('adminToken')
                            }
                        });

                        const result = await response.json();

                        if (result.success) {
                            showAlert('تم حذف الوسم بنجاح', 'success');
                            loadTags();
                        } else {
                            showAlert(result.error || 'حدث خطأ في الحذف', 'error');
                        }
                    } catch (error) {
                        console.error('Error deleting tag:', error);
                        showAlert('حدث خطأ في الخادم', 'error');
                    }
                }
            }

            async function removePromotion(id) {
                if (confirm('هل أنت متأكد من إلغاء تمييز هذا المحتوى؟')) {
                    try {
                        const response = await fetch(`${API_BASE}/content/${id}/unpromote`, {
                            method: 'PUT',
                            headers: {
                                'x-admin-token': localStorage.getItem('adminToken'),
                                'Content-Type': 'application/json'
                            }
                        });

                        const result = await response.json();

                        if (result.success) {
                            showAlert('تم إلغاء التميز بنجاح', 'success');
                            loadPromotions();
                            loadSeries();
                            loadMovies();
                        } else {
                            showAlert(result.error || 'حدث خطأ في إلغاء التميز', 'error');
                        }
                    } catch (error) {
                        console.error('Error removing promotion:', error);
                        showAlert('حدث خطأ في الخادم', 'error');
                    }
                }
            }

            // ==========================================
            // 10. رفع الملفات
            // ==========================================
            function triggerUpload(type, previewId, targetId) {
                currentUpload = {
                    callback: (fileUrl) => {
                        if (previewId && previewId.includes('preview')) {
                            const preview = document.getElementById(previewId);
                            if (preview) {
                                preview.src = fileUrl;
                                preview.classList.remove('hidden');
                            }
                        } else if (previewId) {
                            const preview = document.getElementById(previewId);
                            if (preview) {
                                preview.classList.remove('hidden');
                            }
                        }

                        if (targetId) {
                            const target = document.getElementById(targetId);
                            if (target) {
                                target.value = fileUrl;
                            }
                        }
                    },
                    target: type,
                    preview: previewId
                };

                document.getElementById('upload-modal').style.display = 'flex';

                // إعادة تعيين حالة الرفع
                document.getElementById('upload-progress').classList.add('hidden');
                document.getElementById('upload-success').classList.add('hidden');
            }

            async function handleFileUpload(input) {
                if (!input.files[0]) return;

                const file = input.files[0];
                const formData = new FormData();
                formData.append('file', file);



                // إظهار شريط التقدم
                const progressDiv = document.getElementById('upload-progress');
                const filenameSpan = document.getElementById('upload-filename');
                const percentageSpan = document.getElementById('upload-percentage');
                const progressBar = document.getElementById('upload-bar');
                const statusSpan = document.getElementById('upload-status');

                progressDiv.classList.remove('hidden');
                filenameSpan.textContent = file.name;

                try {
                    const response = await fetch(`${API_BASE}/upload?type=${currentUpload.target}`, {
                        method: 'POST',
                        headers: {
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error('فشل رفع الملف');
                    }

                    const result = await response.json();

                    if (result.success) {
                        // إظهار حالة النجاح
                        progressDiv.classList.add('hidden');
                        document.getElementById('upload-success').classList.remove('hidden');

                        if (currentUpload.target === 'episode' && file.type.startsWith('video/')) {
                            try {
                                const video = document.createElement('video');
                                video.preload = 'metadata';

                                video.onloadedmetadata = function () {
                                    window.URL.revokeObjectURL(video.src);
                                    const totalSeconds = Math.floor(video.duration);

                                    // حساب الساعات والدقائق والثواني
                                    const hours = Math.floor(totalSeconds / 3600);
                                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                                    const seconds = totalSeconds % 60;

                                    // تنسيق المدة بصيغة 00:00:00
                                    const formatted = [
                                        hours.toString().padStart(2, '0'),
                                        minutes.toString().padStart(2, '0'),
                                        seconds.toString().padStart(2, '0')
                                    ].join(':');

                                    // وضع المدة في حقل المدة
                                    document.getElementById('episode-duration').value = formatted;
                                };

                                video.src = URL.createObjectURL(file);
                            } catch (err) {
                                console.error('خطأ في استخراج المدة:', err);
                            }
                        }

                        // استدعاء callback مع رابط الملف
                        if (currentUpload.callback) {
                            currentUpload.callback(result.url);
                        }
                    } else {
                        throw new Error(result.error || 'فشل رفع الملف');
                    }
                } catch (error) {
                    statusSpan.textContent = 'فشل رفع الملف: ' + error.message;
                    statusSpan.classList.add('text-danger');
                    progressBar.classList.add('bg-danger');
                }
            }

            async function handleBackupUpload(input) {
                if (!input.files[0]) return;

                const file = input.files[0];
                const formData = new FormData();
                formData.append('backup', file);

                try {
                    const response = await fetch(`${API_BASE}/restore`, {
                        method: 'POST',
                        headers: {
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: formData
                    });

                    const result = await response.json();
                    const restoreResult = document.getElementById('restore-result');

                    if (result.success) {
                        restoreResult.innerHTML = `
                        <div class="alert alert-success">
                            <i class="fas fa-check-circle"></i>
                            <span>${result.message}</span>
                        </div>
                    `;

                        // إعادة تحميل البيانات بعد 2 ثانية
                        setTimeout(() => {
                            location.reload();
                        }, 2000);
                    } else {
                        restoreResult.innerHTML = `
                        <div class="alert alert-error">
                            <i class="fas fa-exclamation-circle"></i>
                            <span>${result.error}</span>
                        </div>
                    `;
                    }
                } catch (error) {
                    document.getElementById('restore-result').innerHTML = `
                    <div class="alert alert-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>حدث خطأ في استعادة النسخة الاحتياطية</span>
                    </div>
                `;
                }
            }

            // ==========================================
            // 11. وظائف مساعدة
            // ==========================================
            function closeModal(modalId) {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.style.display = 'none';
                }
            }

            function resetModal(modalId) {
                const modal = document.getElementById(modalId);
                if (!modal) return;

                const form = modal.querySelector('form');
                if (form) {
                    form.reset();
                    delete form.dataset.editId;

                    // إعادة تعيين الصور
                    modal.querySelectorAll('img.upload-preview').forEach(img => {
                        img.classList.add('hidden');
                        img.src = '';
                    });

                    // إعادة تعيين الحقول المخفية
                    modal.querySelectorAll('input[type="hidden"]').forEach(input => {
                        input.value = '';
                    });

                    // إعادة تعيين عناصر المعلومات
                    modal.querySelectorAll('.hidden').forEach(el => {
                        el.classList.add('hidden');
                    });

                    // إعادة النصوص الأصلية
                    const header = modal.querySelector('.modal-title');
                    const submitBtn = modal.querySelector('button[type="submit"]');

                    if (header && modalId.includes('add-')) {
                        const type = modalId.replace('add-', '').replace('-modal', '');
                        const arabicType = getArabicType(type);
                        header.textContent = `إضافة ${arabicType} جديد`;
                        if (submitBtn) submitBtn.textContent = `حفظ ${arabicType}`;
                    }
                }
            }

            function getArabicType(type) {
                const types = {
                    'series': 'مسلسل',
                    'movie': 'فيلم',
                    'season': 'موسم',
                    'episode': 'حلقة',
                    'part': 'جزء',
                    'actor': 'ممثل',
                    'genre': 'تصنيف',
                    'country': 'دولة',
                    'tag': 'وسم'
                };
                return types[type] || type;
            }

            function getTagTypeClass(type) {
                const classes = {
                    'general': 'bg-gray-800 text-gray-300',
                    'trending': 'bg-red-900/30 text-red-300',
                    'premium': 'bg-green-900/30 text-green-300',
                    'popular': 'bg-yellow-900/30 text-yellow-300',
                    'quality': 'bg-blue-900/30 text-blue-300',
                    'seasonal': 'bg-purple-900/30 text-purple-300',
                    'classic': 'bg-orange-900/30 text-orange-300'
                };
                return classes[type] || classes.general;
            }

            function getTagTypeName(type) {
                const names = {
                    'general': 'عام',
                    'trending': 'توندينغ',
                    'premium': 'مميز',
                    'popular': 'شائع',
                    'quality': 'جودة عالية',
                    'seasonal': 'موسمي',
                    'classic': 'كلاسيكي'
                };
                return names[type] || 'عام';
            }

            async function createBackup() {
                try {
                    const response = await fetch(`${API_BASE}/backup`, {
                        headers: {
                            'x-admin-token': localStorage.getItem('adminToken')
                        }
                    });

                    const backup = await response.json();

                    // تحميل الملف
                    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `media-net-backup-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);

                    document.getElementById('backup-result').innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i>
                        <span>تم إنشاء النسخة الاحتياطية بنجاح</span>
                    </div>
                `;
                } catch (error) {
                    document.getElementById('backup-result').innerHTML = `
                    <div class="alert alert-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>حدث خطأ في إنشاء النسخة الاحتياطية</span>
                    </div>
                `;
                }
            }

            async function cleanupMedia() {
                if (confirm('سيتم مسح جميع الملفات غير المستخدمة. هل أنت متأكد؟')) {
                    try {
                        const response = await fetch(`${API_BASE}/cleanup`, {
                            method: 'POST',
                            headers: {
                                'x-admin-token': localStorage.getItem('adminToken')
                            }
                        });

                        const result = await response.json();

                        if (result.success) {
                            showAlert('تم تنظيف الملفات بنجاح', 'success');
                        } else {
                            showAlert(result.error || 'حدث خطأ في التنظيف', 'error');
                        }
                    } catch (error) {
                        console.error('Error cleaning media:', error);
                        showAlert('حدث خطأ في الخادم', 'error');
                    }
                }
            }

            function showAlert(message, type = 'info') {
                const alertContainer = document.getElementById('alert-container');
                if (!alertContainer) return;

                const alert = document.createElement('div');
                alert.className = `alert alert-${type}`;
                alert.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            `;

                alertContainer.appendChild(alert);

                // إزالة التنبيه بعد 5 ثواني
                setTimeout(() => {
                    alert.style.opacity = '0';
                    alert.style.transform = 'translateX(-20px)';
                    setTimeout(() => alert.remove(), 300);
                }, 5000);
            }

            // إغلاق المودال بالضغط على ESC
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    document.querySelectorAll('.modal[style*="display: flex"]').forEach(modal => {
                        closeModal(modal.id);
                    });
                }
            });

            // إغلاق المودال بالضغط خارج المحتوى
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        closeModal(modal.id);
                    }
                });
            });

            // إضافة event listeners للألوان
            document.querySelectorAll('input[type="color"]').forEach(colorInput => {
                colorInput.addEventListener('input', function () {
                    const textInput = this.parentElement.querySelector('input[type="text"]');
                    if (textInput) {
                        textInput.value = this.value;
                    }
                });
            });

            document.querySelectorAll('input[name="colorText"]').forEach(textInput => {
                textInput.addEventListener('input', function () {
                    const colorInput = this.parentElement.querySelector('input[type="color"]');
                    if (colorInput && this.value.match(/^#[0-9A-F]{6}$/i)) {
                        colorInput.value = this.value;
                    }
                });
            });

            // البحث في المسلسلات
            const searchSeriesInput = document.getElementById('search-series');
            if (searchSeriesInput) {
                searchSeriesInput.addEventListener('input', function () {
                    const searchTerm = this.value.toLowerCase();
                    const tableBody = document.querySelector('#series-table tbody');
                    if (!tableBody) return;

                    const rows = tableBody.querySelectorAll('tr');
                    rows.forEach(row => {
                        const text = row.textContent.toLowerCase();
                        row.style.display = text.includes(searchTerm) ? '' : 'none';
                    });
                });
            }

            // تحديث قائمة المحتويات لأدوار الممثلين عند تحميل الصفحة
            window.addEventListener('load', async () => {
                if (document.getElementById('content-select-actor')) {
                    try {
                        const response = await fetch(`${API_BASE}/series`);
                        const content = await response.json();
                        const select = document.getElementById('content-select-actor');
                        if (select && select.options.length <= 1) {
                            select.innerHTML = '<option value="">اختر محتوى لعرض الممثلين المرتبطين به</option>' +
                                content.map(c => `<option value="${c.id}">${c.title} (${c.isMovie ? 'فيلم' : 'مسلسل'})</option>`).join('');
                        }
                    } catch (error) {
                        console.error('Error loading content for actor roles:', error);
                    }
                }
            });

            // وظيفة استخراج المدة من ملف الفيديو
            async function getVideoDuration(file) {
                return new Promise((resolve) => {
                    const video = document.createElement('video');
                    video.preload = 'metadata';
                    video.onloadedmetadata = function () {
                        window.URL.revokeObjectURL(video.src);
                        const totalSeconds = Math.floor(video.duration);
                        const hours = Math.floor(totalSeconds / 3600);
                        const minutes = Math.floor((totalSeconds % 3600) / 60);
                        const seconds = totalSeconds % 60;
                        // تنسيق المدة بصيغة 00:00:00
                        const formatted = [hours, minutes, seconds]
                            .map(v => v < 10 ? "0" + v : v)
                            .join(":");
                        resolve(formatted);
                    };
                    video.src = URL.createObjectURL(file);
                });
            }

            // عند اختيار ملف فيديو للحلقة
            document.getElementById('episode-video-input').addEventListener('change', async function (e) {
                if (e.target.files[0]) {
                    const duration = await getVideoDuration(e.target.files[0]);
                    document.getElementById('episode-duration').value = episodes.duration;
                }
            });

            // ==========================================
            // إدارة الملفات
            // ==========================================

            let allFiles = [];
            let filteredFiles = [];
            let currentFileType = 'all';
            let currentFileToLink = null;

            // تحميل الملفات عند فتح القسم
            function loadFiles() {
                showSection('files');

                document.getElementById('files-loading').style.display = 'flex';
                document.getElementById('files-grid').innerHTML = '';
                document.getElementById('files-empty').classList.add('hidden');

                console.log('جاري تحميل الملفات من:', `${API_BASE}/files/list`); // للتشخيص

                fetch(`${API_BASE}/files/list`, {  // تم التغيير من /files إلى /files/list
                    headers: {
                        'x-admin-token': localStorage.getItem('adminToken')
                    }
                })
                    .then(async res => {
                        console.log('استجابة الخادم:', res.status);
                        if (!res.ok) {
                            const text = await res.text();
                            throw new Error(`خطأ ${res.status}: ${text.substring(0, 100)}`);
                        }
                        return res.json();
                    })
                    .then(data => {
                        console.log('البيانات المستلمة:', data);

                        if (data.success) {
                            allFiles = data.files || [];
                            updateFileStats();
                            filterFiles();
                        } else {
                            showAlert('حدث خطأ في تحميل الملفات: ' + (data.error || 'غير معروف'), 'error');
                        }
                    })
                    .catch(error => {
                        console.error('خطأ في تحميل الملفات:', error);
                        showAlert('حدث خطأ في تحميل الملفات: ' + error.message, 'error');

                        // عرض رسالة خطأ في الواجهة
                        document.getElementById('files-loading').style.display = 'none';
                        document.getElementById('files-grid').innerHTML = `
                    <div class="empty-state col-span-full">
                        <i class="fas fa-exclamation-triangle text-4xl text-danger mb-3"></i>
                        <h3 class="text-xl font-bold mb-2">خطأ في التحميل</h3>
                        <p class="text-gray-500">${error.message}</p>
                        <p class="text-sm text-gray-600 mt-2">المسار: ${API_BASE}/files/list</p>
                        <button onclick="loadFiles()" class="btn-primary mt-4">
                            <i class="fas fa-sync-alt ml-2"></i>
                            إعادة المحاولة
                        </button>
                    </div>
                `;
                    })
                    .finally(() => {
                        document.getElementById('files-loading').style.display = 'none';
                    });
            }

            // تحديث الإحصائيات
            function updateFileStats() {
                let stats = {
                    total: allFiles.length,
                    totalSize: 0,
                    images: { count: 0, size: 0 },
                    videos: { count: 0, size: 0 },
                    subtitles: { count: 0, size: 0 },
                    others: { count: 0, size: 0 }
                };

                allFiles.forEach(file => {
                    stats.totalSize += file.size || 0;

                    // استخدم category كما يرسلها الخادم
                    if (file.category === 'image') {
                        stats.images.count++;
                        stats.images.size += file.size || 0;
                    } else if (file.category === 'video') {
                        stats.videos.count++;
                        stats.videos.size += file.size || 0;
                    } else if (file.category === 'subtitle') {
                        stats.subtitles.count++;
                        stats.subtitles.size += file.size || 0;
                    } else {
                        stats.others.count++;
                        stats.others.size += file.size || 0;
                    }
                });

                // تحديث الأرقام
                document.getElementById('total-files-count').textContent = stats.total;
                document.getElementById('total-size').textContent = formatBytes(stats.totalSize);
                document.getElementById('images-count').textContent = stats.images.count;
                document.getElementById('images-size').textContent = formatBytes(stats.images.size);
                document.getElementById('videos-count').textContent = stats.videos.count;
                document.getElementById('videos-size').textContent = formatBytes(stats.videos.size);
                document.getElementById('subtitles-count').textContent = stats.subtitles.count;
                document.getElementById('subtitles-size').textContent = formatBytes(stats.subtitles.size);
                document.getElementById('others-count').textContent = stats.others.count;
                document.getElementById('others-size').textContent = formatBytes(stats.others.size);

                // تحديث شريط التخزين
                if (stats.totalSize > 0) {
                    updateStorageBar('images', stats.images.size, stats.totalSize);
                    updateStorageBar('videos', stats.videos.size, stats.totalSize);
                    updateStorageBar('subtitles', stats.subtitles.size, stats.totalSize);
                    updateStorageBar('others', stats.others.size, stats.totalSize);

                    const totalSizeGB = stats.totalSize / (1024 * 1024 * 1024);
                    const maxStorage = 5; // 5GB
                    const percentage = Math.min((totalSizeGB / maxStorage) * 100, 100);
                    document.getElementById('storage-percentage').textContent = `${percentage.toFixed(1)}% مستخدم`;
                }
            }

            function updateStorageBar(category, size, totalSize) {
                const percent = totalSize > 0 ? (size / totalSize) * 100 : 0;
                document.getElementById(`storage-${category}-bar`).style.width = `${percent}%`;
                document.getElementById(`storage-${category}-percent`).textContent = `${percent.toFixed(1)}%`;
            }

            // تصفية الملفات
            function filterFiles() {
                const searchTerm = document.getElementById('file-search')?.value.toLowerCase() || '';
                const typeFilter = document.getElementById('file-type-filter')?.value || 'all';
                const statusFilter = document.getElementById('file-status-filter')?.value || 'all';
                const sortBy = document.getElementById('file-sort')?.value || 'date-desc';

                filteredFiles = allFiles.filter(file => {
                    // فلترة حسب البحث
                    if (searchTerm && !file.name.toLowerCase().includes(searchTerm)) {
                        return false;
                    }

                    // فلترة حسب النوع
                    if (typeFilter !== 'all') {
                        if (typeFilter === 'image' && !file.type?.startsWith('image/')) return false;
                        if (typeFilter === 'video' && !file.type?.startsWith('video/')) return false;
                        if (typeFilter === 'subtitle' && !file.name?.match(/\.(vtt|srt)$/i)) return false;
                        if (typeFilter === 'other' && (file.type?.startsWith('image/') || file.type?.startsWith('video/') || file.name?.match(/\.(vtt|srt)$/i))) return false;
                    }

                    // فلترة حسب حالة الربط
                    if (statusFilter !== 'all') {
                        const isLinked = file.linkedTo && file.linkedTo.length > 0;
                        if (statusFilter === 'linked' && !isLinked) return false;
                        if (statusFilter === 'unlinked' && isLinked) return false;
                    }

                    return true;
                });

                // ترتيب الملفات
                filteredFiles.sort((a, b) => {
                    switch (sortBy) {
                        case 'date-desc': return (b.uploadedAt || 0) - (a.uploadedAt || 0);
                        case 'date-asc': return (a.uploadedAt || 0) - (b.uploadedAt || 0);
                        case 'size-desc': return (b.size || 0) - (a.size || 0);
                        case 'size-asc': return (a.size || 0) - (b.size || 0);
                        case 'name-asc': return a.name?.localeCompare(b.name) || 0;
                        case 'name-desc': return b.name?.localeCompare(a.name) || 0;
                        default: return 0;
                    }
                });

                displayFiles();
            }

            // عرض الملفات
            function displayFiles() {
                const grid = document.getElementById('files-grid');
                const emptyState = document.getElementById('files-empty');

                if (filteredFiles.length === 0) {
                    grid.innerHTML = '';
                    emptyState.classList.remove('hidden');
                    return;
                }

                emptyState.classList.add('hidden');

                grid.innerHTML = filteredFiles.map(file => {
                    const fileUrl = file.url || `${API_BASE}/uploads/${file.path}`;
                    const isImage = file.type?.startsWith('image/');
                    const isVideo = file.type?.startsWith('video/');
                    const isSubtitle = file.name?.match(/\.(vtt|srt)$/i);
                    const isLinked = file.linkedTo && file.linkedTo.length > 0;

                    return `
                    <div class="grid-item file-item" data-file="${file.path}">
                        <div class="relative">
                            ${isImage ? `
                                <img src="${fileUrl}" class="w-full h-40 object-cover rounded-lg mb-3" 
                                     onerror="this.src='/uploads/posters/default.jpg'">
                            ` : isVideo ? `
                                <div class="w-full h-40 bg-gray-900 rounded-lg mb-3 flex items-center justify-center">
                                    <i class="fas fa-video text-5xl text-gray-600"></i>
                                </div>
                            ` : `
                                <div class="w-full h-40 bg-gray-900 rounded-lg mb-3 flex items-center justify-center">
                                    <i class="fas fa-file text-5xl text-gray-600"></i>
                                </div>
                            `}
                            
                            ${isLinked ? `
                                <span class="absolute top-2 right-2 status-badge status-active">
                                    <i class="fas fa-link ml-1"></i> مرتبط
                                </span>
                            ` : `
                                <span class="absolute top-2 right-2 status-badge status-inactive">
                                    غير مرتبط
                                </span>
                            `}
                        </div>
                        
                        <div class="mb-2">
                            <div class="font-bold text-white truncate" title="${file.name}">${file.name}</div>
                            <div class="text-xs text-gray-500 mt-1">
                                ${formatBytes(file.size || 0)} • ${new Date(file.uploadedAt || Date.now()).toLocaleDateString('ar-SA')}
                            </div>
                        </div>
                        
                        ${isLinked && file.linkedTo ? `
                            <div class="mb-3 text-xs">
                                ${file.linkedTo.map(link => `
                                    <div class="flex items-center gap-1 text-gray-400">
                                        <i class="fas fa-link text-xs"></i>
                                        <span>${link.title} (${link.type})</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="flex flex-wrap gap-2 mt-3">
                            ${!isLinked ? `
                                <button class="action-btn btn-edit flex-1" onclick="showLinkFileModal('${file.path}', '${file.name}', ${file.size || 0})">
                                    <i class="fas fa-link"></i>
                                    ربط
                                </button>
                            ` : `
                                <button class="action-btn btn-view flex-1" onclick="viewFileLinks('${file.path}')">
                                    <i class="fas fa-eye"></i>
                                    عرض الربط
                                </button>
                            `}
                            
                            <button class="action-btn btn-delete" onclick="deleteFile('${file.path}', '${file.name}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        
                        ${isImage ? `
                            <button class="action-btn btn-view w-full mt-2" onclick="window.open('${fileUrl}', '_blank')">
                                <i class="fas fa-external-link-alt"></i>
                                عرض الصورة
                            </button>
                        ` : ''}
                    </div>
                `;
                }).join('');
            }

            // إظهار نافذة ربط الملف
            function showLinkFileModal(filePath, fileName, fileSize) {
                currentFileToLink = { path: filePath, name: fileName, size: fileSize };

                document.getElementById('link-file-name').textContent = fileName;
                document.getElementById('link-file-size').textContent = formatBytes(fileSize);
                document.getElementById('link-file-url').value = filePath;

                resetModal('link-file-modal');
                document.getElementById('link-file-modal').style.display = 'flex';
            }

            // تحميل المحتوى للربط
            async function loadContentForLinking() {
                const type = document.getElementById('link-content-type').value;
                const select = document.getElementById('link-content-id');

                if (!type) {
                    select.innerHTML = '<option value="">اختر المحتوى أولاً</option>';
                    return;
                }

                try {
                    const response = await fetch(`${API_BASE}/${type === 'movie' ? 'series?isMovie=true' : type === 'series' ? 'series?isMovie=false' : type + 's'}`);
                    const items = await response.json();

                    select.innerHTML = '<option value="">اختر ' +
                        (type === 'series' ? 'المسلسل' :
                            type === 'movie' ? 'الفيلم' :
                                type === 'actor' ? 'الممثل' :
                                    type === 'episode' ? 'الحلقة' :
                                        type === 'season' ? 'الموسم' : 'الجزء') + '</option>' +
                        items.map(item => `<option value="${item.id}">${item.title || item.name || item.seasonNumber || item.episodeNumber}</option>`).join('');
                } catch (error) {
                    console.error('Error loading content for linking:', error);
                    showAlert('حدث خطأ في تحميل المحتوى', 'error');
                }
            }

            // ربط الملف
            document.getElementById('link-file-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();

                const filePath = document.getElementById('link-file-url').value;
                const contentType = document.getElementById('link-content-type').value;
                const contentId = document.getElementById('link-content-id').value;
                const field = document.getElementById('link-field').value;

                try {
                    const response = await fetch(`${API_BASE}/files/link`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify({
                            filePath,
                            contentType,
                            contentId,
                            field
                        })
                    });

                    const result = await response.json();

                    if (result.success) {
                        showAlert('تم ربط الملف بنجاح', 'success');
                        closeModal('link-file-modal');
                        loadFiles(); // إعادة تحميل الملفات
                    } else {
                        showAlert(result.error || 'حدث خطأ في الربط', 'error');
                    }
                } catch (error) {
                    console.error('Error linking file:', error);
                    showAlert('حدث خطأ في الخادم', 'error');
                }
            });

            // حذف ملف
            async function deleteFile(filePath, fileName) {
                if (confirm(`هل أنت متأكد من حذف الملف "${fileName}"؟`)) {
                    try {
                        const response = await fetch(`${API_BASE}/files/delete`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-admin-token': localStorage.getItem('adminToken')
                            },
                            body: JSON.stringify({ filePath })
                        });

                        const result = await response.json();

                        if (result.success) {
                            showAlert('تم حذف الملف بنجاح', 'success');
                            loadFiles(); // إعادة تحميل الملفات
                        } else {
                            showAlert(result.error || 'حدث خطأ في الحذف', 'error');
                        }
                    } catch (error) {
                        console.error('Error deleting file:', error);
                        showAlert('حدث خطأ في الخادم', 'error');
                    }
                }
            }

            // عرض روابط الملف
            function viewFileLinks(filePath) {
                const file = allFiles.find(f => f.path === filePath);
                if (!file || !file.linkedTo || file.linkedTo.length === 0) return;

                let message = 'الملف مرتبط بـ:\n\n';
                file.linkedTo.forEach(link => {
                    message += `- ${link.title} (${link.type})\n`;
                });

                alert(message);
            }

            // رفع ملف
            function showFileUploadModal() {
                resetModal('file-upload-modal');
                document.getElementById('upload-preview').classList.add('hidden');
                document.getElementById('upload-progress').classList.add('hidden');
                document.getElementById('upload-success').classList.add('hidden');
                document.getElementById('file-upload-modal').style.display = 'flex';
            }

            function handleFileSelect(input) {
                if (!input.files[0]) return;

                const file = input.files[0];
                const preview = document.getElementById('upload-preview');
                const isImage = file.type.startsWith('image/');

                if (isImage) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        preview.innerHTML = `
                        <img src="${e.target.result}" class="max-w-full max-h-48 mx-auto rounded-lg border border-gray-700">
                        <p class="text-center mt-2 text-sm text-gray-400">${file.name}</p>
                    `;
                    };
                    reader.readAsDataURL(file);
                } else {
                    preview.innerHTML = `
                    <div class="flex items-center gap-3 p-4 bg-gray-900 rounded-lg">
                        <i class="fas ${file.type.startsWith('video/') ? 'fa-video' : 'fa-file'} text-3xl text-gray-400"></i>
                        <div>
                            <p class="font-medium">${file.name}</p>
                            <p class="text-sm text-gray-500">${formatBytes(file.size)}</p>
                        </div>
                    </div>
                `;
                }

                preview.classList.remove('hidden');
                uploadFile(file);
            }

            async function uploadFile(file) {
                const formData = new FormData();
                formData.append('file', file);

                const progressDiv = document.getElementById('upload-progress');
                const filenameSpan = document.getElementById('upload-filename');
                const percentageSpan = document.getElementById('upload-percentage');
                const progressBar = document.getElementById('upload-bar');

                progressDiv.classList.remove('hidden');
                filenameSpan.textContent = file.name;

                try {
                    const response = await fetch(`${API_BASE}/upload?type=file`, {
                        method: 'POST',
                        headers: {
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: formData
                    });

                    const result = await response.json();

                    if (result.success) {
                        progressDiv.classList.add('hidden');
                        document.getElementById('upload-success').classList.remove('hidden');

                        // إعادة تحميل الملفات بعد ثانيتين
                        setTimeout(() => {
                            closeModal('file-upload-modal');
                            loadFiles();
                        }, 2000);
                    } else {
                        throw new Error(result.error || 'فشل رفع الملف');
                    }
                } catch (error) {
                    document.getElementById('upload-status').textContent = 'فشل رفع الملف: ' + error.message;
                    document.getElementById('upload-status').classList.add('text-danger');
                }
            }

            // تحديث شاشة الملفات
            function refreshFiles() {
                loadFiles();
            }

            // دوال مساعدة
            function formatBytes(bytes, decimals = 2) {
                if (bytes === 0) return '0 Bytes';

                const k = 1024;
                const dm = decimals < 0 ? 0 : decimals;
                const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

                const i = Math.floor(Math.log(bytes) / Math.log(k));

                return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
            }



            // ==========================================
            // المتغيرات العامة
            // ==========================================
            window.allTags = []; // تخزين جميع الوسوم لاستخدامها لاحقاً

            // ==========================================
            // تحميل المحتويات المرتبطة بالوسوم (دالة جديدة)
            // ==========================================
            async function loadTaggedContent() {
                const loading = document.getElementById('tagged-content-loading');
                const tableBody = document.querySelector('#tagged-content-table tbody');

                if (!tableBody) return;

                loading.style.display = 'flex';
                tableBody.innerHTML = '';

                try {
                    // جلب جميع المسلسلات والأفلام
                    const response = await fetch(`${API_BASE}/series`);
                    const allContent = await response.json();

                    // تصفية المحتويات التي تحتوي على وسوم
                    const taggedContent = allContent.filter(item => item.tags && item.tags.length > 0);

                    if (taggedContent.length === 0) {
                        tableBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center py-8 text-gray-500">
                                لا توجد محتويات مرتبطة بوسوم
                            </td>
                        </tr>
                    `;
                        loading.style.display = 'none';
                        return;
                    }

                    // عرض المحتويات في الجدول
                    tableBody.innerHTML = taggedContent.map(item => {
                        // تحويل أسماء الوسوم إلى HTML مع الألوان
                        const tagsHtml = (item.tags || []).map(tagName => {
                            const tag = window.allTags.find(t => t.name === tagName);
                            return `<span class="status-badge" style="background-color: ${tag?.color || '#1bd68e'}20; color: ${tag?.color || '#1bd68e'}; border: 1px solid ${tag?.color || '#1bd68e'}30; margin: 2px;">
                            <i class="fas fa-tag ml-1" style="font-size: 10px;"></i>
                            ${tagName}
                        </span>`;
                        }).join(' ') || '<span class="text-gray-500">لا يوجد</span>';

                        return `
                        <tr>
                            <td>
                                <img src="${item.poster || '/uploads/posters/default.jpg'}" 
                                     class="preview-image"
                                     onerror="this.src='/uploads/posters/default.jpg'">
                            </td>
                            <td>
                                <div class="font-bold text-white">${item.title}</div>
                                ${item.year ? `<div class="text-xs text-gray-500">${item.year}</div>` : ''}
                            </td>
                            <td>
                                <span class="status-badge ${item.isMovie ? 'status-active' : 'status-inactive'}">
                                    ${item.isMovie ? 'فيلم' : 'مسلسل'}
                                </span>
                            </td>
                            <td>
                                <div class="flex flex-wrap gap-1" style="max-width: 300px;">
                                    ${tagsHtml}
                                </div>
                            </td>
                            <td>
                                <button class="action-btn btn-edit" onclick="showTagContentModal('${item.id}', '${item.title.replace(/'/g, "\\'")}')">
                                    <i class="fas fa-tags"></i>
                                    تعديل الوسوم
                                </button>
                            </td>
                        </tr>
                    `;
                    }).join('');

                } catch (error) {
                    console.error('Error loading tagged content:', error);
                    tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center py-8 text-danger">
                            حدث خطأ في تحميل البيانات: ${error.message}
                        </td>
                    </tr>
                `;
                } finally {
                    loading.style.display = 'none';
                }
            }

            // ==========================================
            // تعديل دالة loadTags الموجودة
            // ==========================================
            async function loadTags() {
                try {
                    const response = await fetch(`${API_BASE}/tags`);
                    const tags = await response.json();

                    // حفظ الوسوم في المتغير العام
                    window.allTags = tags;

                    const grid = document.getElementById('tags-grid');
                    if (grid) {
                        grid.innerHTML = tags.map(item => `
                        <div class="grid-item">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                    <div class="w-3 h-3 rounded-full" style="background-color: ${item.color || '#1bd68e'}"></div>
                                    <h3 class="font-bold text-white">${item.name}</h3>
                                </div>
                                <span class="text-xs text-gray-500">${item.count || 0} استخدام</span>
                            </div>
                            <div class="mb-3">
                                <span class="text-xs px-2 py-1 rounded-full ${getTagTypeClass(item.type)}">
                                    ${getTagTypeName(item.type)}
                                </span>
                            </div>
                            <div class="flex justify-end gap-2">
                                <button class="action-btn btn-edit action-btn-sm" onclick="editTag('${item.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn btn-delete action-btn-sm" onclick="deleteTag('${item.id}', '${item.name}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('');
                    }

                    // ✅ تحميل المحتويات المرتبطة بالوسوم
                    loadTaggedContent();

                } catch (error) {
                    console.error('Error loading tags:', error);
                    showAlert('حدث خطأ في تحميل الوسوم', 'error');
                }
            }

            // ==========================================
            // تعديل دالة showTagContentModal الموجودة
            // ==========================================
            function showTagContentModal(contentId = '', contentTitle = '') {
                resetModal('tag-content-modal');

                Promise.all([
                    fetch(`${API_BASE}/series`),
                    fetch(`${API_BASE}/tags`)
                ])
                    .then(([contentRes, tagsRes]) => Promise.all([contentRes.json(), tagsRes.json()]))
                    .then(([content, tags]) => {
                        const contentSelect = document.getElementById('tag-content-select');
                        const tagsChecklist = document.getElementById('tags-checklist');

                        if (contentSelect) {
                            contentSelect.innerHTML = '<option value="">اختر مسلسل أو فيلم</option>' +
                                content.map(c => `<option value="${c.id}" ${c.id === contentId ? 'selected' : ''}>${c.title} (${c.isMovie ? 'فيلم' : 'مسلسل'})</option>`).join('');

                            // إذا كان contentId موجوداً، اجعل القائمة غير قابلة للتعديل
                            if (contentId) {
                                contentSelect.disabled = true;
                            } else {
                                contentSelect.disabled = false;
                            }
                        }

                        if (tagsChecklist) {
                            // جلب المحتوى المحدد لمعرفة الوسوم المرتبطة به
                            let selectedContentTags = [];

                            if (contentId) {
                                fetch(`${API_BASE}/series/${contentId}`)
                                    .then(res => res.json())
                                    .then(contentData => {
                                        selectedContentTags = contentData.tags || [];
                                        renderTagsChecklist(tags, selectedContentTags);
                                    });
                            } else {
                                renderTagsChecklist(tags, []);
                            }

                            function renderTagsChecklist(tags, selectedTags) {
                                tagsChecklist.innerHTML = tags.map(tag => `
                            <div class="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg mb-2">
                                <input type="checkbox" id="tag-${tag.id}" name="tagIds" value="${tag.id}" 
                                       class="rounded border-gray-700 bg-gray-900 text-primary focus:ring-primary"
                                       ${selectedTags.includes(tag.name) ? 'checked' : ''}>
                                <label for="tag-${tag.id}" class="flex items-center gap-3 cursor-pointer flex-1">
                                    <div class="w-3 h-3 rounded-full" style="background-color: ${tag.color}"></div>
                                    <span class="font-medium">${tag.name}</span>
                                    <span class="text-xs text-gray-500 ml-auto">(${tag.count || 0} استخدام)</span>
                                </label>
                            </div>
                        `).join('');
                            }
                        }

                        // تغيير عنوان النافذة إذا كنا في وضع التعديل
                        const modalTitle = document.querySelector('#tag-content-modal .modal-title');
                        if (modalTitle) {
                            modalTitle.textContent = contentId ? `تعديل وسوم: ${contentTitle}` : 'ربط وسوم بالمحتوى';
                        }

                        document.getElementById('tag-content-modal').style.display = 'flex';
                    })
                    .catch(error => {
                        console.error('Error loading data for tag content:', error);
                        showAlert('حدث خطأ في تحميل البيانات', 'error');
                    });
            }

            // ==========================================
            // المتغيرات العامة للبلدان
            // ==========================================
            window.allCountries = []; // تخزين جميع الدول لاستخدامها لاحقاً

            // ==========================================
            // تحميل المحتويات المرتبطة بالدول (دالة جديدة)
            // ==========================================
            async function loadCountryContent() {
                const loading = document.getElementById('country-content-loading');
                const tableBody = document.querySelector('#country-content-table tbody');

                if (!tableBody) return;

                loading.style.display = 'flex';
                tableBody.innerHTML = '';

                try {
                    // جلب جميع المسلسلات والأفلام
                    const response = await fetch(`${API_BASE}/series`);
                    const allContent = await response.json();

                    // تصفية المحتويات التي تحتوي على دول
                    const countryContent = allContent.filter(item => item.countries && item.countries.length > 0);

                    if (countryContent.length === 0) {
                        tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-8 text-gray-500">
                        لا توجد محتويات مرتبطة بدول
                    </td>
                </tr>
            `;
                        loading.style.display = 'none';
                        return;
                    }

                    // عرض المحتويات في الجدول
                    tableBody.innerHTML = countryContent.map(item => {
                        // تحويل أسماء الدول إلى HTML مع الأعلام
                        const countriesHtml = (item.countries || []).map(countryName => {
                            const country = window.allCountries.find(c => c.name === countryName);
                            return `<span class="status-badge" style="background-color: #1bd68e20; color: #1bd68e; border: 1px solid #1bd68e30; margin: 2px; display: inline-flex; align-items: center;">
                    ${country?.flag ? `<img src="${country.flag}" style="width: 16px; height: 12px; margin-left: 4px; object-fit: cover;">` : ''}
                    ${countryName}
                </span>`;
                        }).join(' ') || '<span class="text-gray-500">لا يوجد</span>';

                        return `
                <tr>
                    <td>
                        <img src="${item.poster || '/uploads/posters/default.jpg'}" 
                             class="preview-image"
                             onerror="this.src='/uploads/posters/default.jpg'">
                    </td>
                    <td>
                        <div class="font-bold text-white">${item.title}</div>
                        ${item.year ? `<div class="text-xs text-gray-500">${item.year}</div>` : ''}
                    </td>
                    <td>
                        <span class="status-badge ${item.isMovie ? 'status-active' : 'status-inactive'}">
                            ${item.isMovie ? 'فيلم' : 'مسلسل'}
                        </span>
                    </td>
                    <td>
                        <div class="flex flex-wrap gap-1" style="max-width: 300px;">
                            ${countriesHtml}
                        </div>
                    </td>
                    <td>
                        <button class="action-btn btn-edit" onclick="showCountryContentModal('${item.id}', '${item.title.replace(/'/g, "\\'")}')">
                            <i class="fas fa-globe"></i>
                            تعديل الدول
                        </button>
                    </td>
                </tr>
            `;
                    }).join('');

                } catch (error) {
                    console.error('Error loading country content:', error);
                    tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-8 text-danger">
                    حدث خطأ في تحميل البيانات: ${error.message}
                </td>
            </tr>
        `;
                } finally {
                    loading.style.display = 'none';
                }
            }

            // ==========================================
            // تعديل دالة loadCountries الموجودة
            // ==========================================
            async function loadCountries() {
                try {
                    const response = await fetch(`${API_BASE}/countries`);
                    const countries = await response.json();

                    // حفظ الدول في المتغير العام
                    window.allCountries = countries;

                    const grid = document.getElementById('countries-grid');
                    if (grid) {
                        grid.innerHTML = countries.map(item => `
                <div class="grid-item">
                    <div class="flex items-center gap-3 mb-3">
                        ${item.flag ? `<img src="${item.flag}" class="w-8 h-6 object-cover rounded border" onerror="this.style.display='none'">` : ''}
                        <div>
                            <h3 class="font-bold text-white">${item.name}</h3>
                            ${item.continent ? `<p class="text-xs text-gray-500">${item.continent}</p>` : ''}
                        </div>
                    </div>
                    <div class="flex justify-end gap-2">
                        <button class="action-btn btn-edit action-btn-sm" onclick="editCountry('${item.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn btn-delete action-btn-sm" onclick="deleteCountry('${item.id}', '${item.name}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
                    }

                    // ✅ تحميل المحتويات المرتبطة بالدول
                    loadCountryContent();

                } catch (error) {
                    console.error('Error loading countries:', error);
                    showAlert('حدث خطأ في تحميل الدول', 'error');
                }
            }

            // ==========================================
            // نافذة ربط الدول بالمحتوى (جديدة)
            // ==========================================
            function showCountryContentModal(contentId = '', contentTitle = '') {
                // إنشاء النافذة إذا لم تكن موجودة
                if (!document.getElementById('country-content-modal')) {
                    createCountryContentModal();
                }

                resetModal('country-content-modal');

                Promise.all([
                    fetch(`${API_BASE}/series`),
                    fetch(`${API_BASE}/countries`)
                ])
                    .then(([contentRes, countriesRes]) => Promise.all([contentRes.json(), countriesRes.json()]))
                    .then(([content, countries]) => {
                        const contentSelect = document.getElementById('country-content-select');
                        const countriesChecklist = document.getElementById('countries-checklist');

                        if (contentSelect) {
                            contentSelect.innerHTML = '<option value="">اختر مسلسل أو فيلم</option>' +
                                content.map(c => `<option value="${c.id}" ${c.id === contentId ? 'selected' : ''}>${c.title} (${c.isMovie ? 'فيلم' : 'مسلسل'})</option>`).join('');

                            if (contentId) {
                                contentSelect.disabled = true;
                            } else {
                                contentSelect.disabled = false;
                            }
                        }

                        if (countriesChecklist) {
                            let selectedCountries = [];

                            if (contentId) {
                                fetch(`${API_BASE}/series/${contentId}`)
                                    .then(res => res.json())
                                    .then(contentData => {
                                        selectedCountries = contentData.countries || [];
                                        renderCountriesChecklist(countries, selectedCountries);
                                    });
                            } else {
                                renderCountriesChecklist(countries, []);
                            }

                            function renderCountriesChecklist(countries, selectedCountries) {
                                countriesChecklist.innerHTML = countries.map(country => `
                    <div class="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg mb-2">
                        <input type="checkbox" id="country-${country.id}" name="countryIds" value="${country.name}" 
                               class="rounded border-gray-700 bg-gray-900 text-primary focus:ring-primary"
                               ${selectedCountries.includes(country.name) ? 'checked' : ''}>
                        <label for="country-${country.id}" class="flex items-center gap-3 cursor-pointer flex-1">
                            ${country.flag ? `<img src="${country.flag}" style="width: 24px; height: 16px; object-fit: cover; border-radius: 4px;">` : ''}
                            <span class="font-medium">${country.name}</span>
                            <span class="text-xs text-gray-500 ml-auto">${country.continent || ''}</span>
                        </label>
                    </div>
                `).join('');
                            }
                        }

                        const modalTitle = document.querySelector('#country-content-modal .modal-title');
                        if (modalTitle) {
                            modalTitle.textContent = contentId ? `تعديل دول: ${contentTitle}` : 'ربط دول بالمحتوى';
                        }

                        document.getElementById('country-content-modal').style.display = 'flex';
                    })
                    .catch(error => {
                        console.error('Error loading data for country content:', error);
                        showAlert('حدث خطأ في تحميل البيانات', 'error');
                    });
            }

            // ==========================================
            // إنشاء نافذة ربط الدول (إذا لم تكن موجودة)
            // ==========================================
            function createCountryContentModal() {
                const modalHTML = `
        <div id="country-content-modal" class="modal">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2 class="modal-title">ربط دول بالمحتوى</h2>
                    <button class="close-modal" onclick="closeModal('country-content-modal')">&times;</button>
                </div>
                <form id="country-content-form">
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">المحتوى *</label>
                            <select id="country-content-select" class="form-input" required>
                                <option value="">اختر مسلسل أو فيلم</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">اختر الدول</label>
                            <div id="countries-checklist" class="p-4 bg-gray-900 rounded-lg max-h-60 overflow-y-auto">
                                <!-- Countries checklist will be loaded here -->
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('country-content-modal')">إلغاء</button>
                        <button type="submit" class="btn-primary">حفظ التغييرات</button>
                    </div>
                </form>
            </div>
        </div>
    `;

                document.body.insertAdjacentHTML('beforeend', modalHTML);

                // إضافة معالج حدث للنموذج
                document.getElementById('country-content-form').addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const formData = new FormData(e.target);
                    const contentId = document.getElementById('country-content-select').value;
                    const countryNames = Array.from(document.querySelectorAll('input[name="countryIds"]:checked')).map(cb => cb.value);

                    if (!contentId) {
                        showAlert('يجب اختيار محتوى', 'error');
                        return;
                    }

                    try {
                        // جلب بيانات المحتوى الحالية
                        const response = await fetch(`${API_BASE}/series/${contentId}`);
                        const content = await response.json();

                        // تحديث قائمة الدول
                        content.countries = countryNames;

                        // حفظ التغييرات
                        const updateResponse = await fetch(`${API_BASE}/series/${contentId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-admin-token': localStorage.getItem('adminToken')
                            },
                            body: JSON.stringify(content)
                        });

                        const result = await updateResponse.json();

                        if (result.success) {
                            showAlert('تم تحديث الدول بنجاح', 'success');
                            closeModal('country-content-modal');
                            loadCountries(); // إعادة تحميل بيانات الدول والمحتويات
                        } else {
                            showAlert(result.error || 'حدث خطأ في التحديث', 'error');
                        }
                    } catch (error) {
                        console.error('Error updating countries:', error);
                        showAlert('حدث خطأ في الخادم', 'error');
                    }
                });
            }

            // ==========================================
            // 11. مدير الملفات (NAS System)
            // ==========================================
            let currentFolderPath = '';

            async function loadFiles(dir = '') {
                currentFolderPath = dir;
                try {
                    const response = await fetch(`${API_BASE}/fs/list?dir=${encodeURIComponent(dir)}`, {
                        headers: { 'x-admin-token': localStorage.getItem('adminToken') }
                    });
                    const result = await response.json();
                    
                    if (!result.success) {
                        showAlert(result.error || 'حدث خطأ في تحميل الملفات', 'error');
                        return;
                    }

                    // تحديث المسارات (Breadcrumbs)
                    const breadcrumbs = document.getElementById('files-breadcrumbs');
                    let breadHtml = `<button onclick="loadFiles('')" class="text-primary hover:underline font-bold"><i class="fas fa-home"></i> الرئيسية</button>`;
                    if (dir) {
                        const parts = dir.split('/');
                        let current = '';
                        parts.forEach((p, i) => {
                            if (!p) return;
                            current += (current ? '/' : '') + p;
                            breadHtml += ` <span class="text-gray-500">/</span> <button onclick="loadFiles('${current}')" class="text-primary hover:underline">${p}</button>`;
                        });
                    }
                    breadcrumbs.innerHTML = breadHtml;

                    // عرض الملفات
                    const grid = document.getElementById('files-grid');
                    if (result.files.length === 0) {
                        grid.innerHTML = `<div class="col-span-full text-center py-10 text-gray-500">المجلد فارغ</div>`;
                        return;
                    }

                    grid.innerHTML = result.files.map(item => {
                        const isDir = item.isDir;
                        const iconClass = isDir ? 'fa-folder text-yellow-500' : 
                                          (item.category === 'image' ? 'fa-image text-blue-400' : 
                                          (item.category === 'video' ? 'fa-film text-purple-400' : 'fa-file text-gray-400'));
                        
                        // بادج الارتباط
                        let badgeHtml = '';
                        if (!isDir) {
                            if (item.links && item.links.length > 0) {
                                const linkNames = item.links.map(l => `${l.type}: ${l.title} (${l.field})`).join('، ');
                                badgeHtml = `<div class="absolute top-2 right-2 bg-primary text-white text-[10px] px-2 py-1 rounded-full shadow" title="${linkNames}">مرتبط بـ ${item.links.length}</div>`;
                            } else {
                                badgeHtml = `<div class="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full shadow">غير مرتبط</div>`;
                            }
                        }

                        const sizeStr = isDir ? '' : `<div class="text-xs text-gray-500 mt-1">${(item.size / 1024 / 1024).toFixed(2)} MB</div>`;
                        const actionClick = isDir ? `onclick="loadFiles('${item.path}')"` : `onclick="showLinkFileModal('${item.url}', '${item.category}')"`;

                        return `
                            <div class="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-primary transition-all relative group cursor-pointer">
                                ${badgeHtml}
                                <div class="text-center" ${actionClick}>
                                    <i class="fas ${iconClass} text-5xl mb-3 ${isDir ? 'group-hover:scale-110 transition-transform' : ''}"></i>
                                    <div class="text-sm font-medium truncate w-full" title="${item.name}">${item.name}</div>
                                    ${sizeStr}
                                </div>
                                <div class="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                    <button onclick="showMoveModal('${item.path}', '${item.name}')" class="bg-gray-800 text-white p-2 rounded-full hover:bg-primary" title="نقل"><i class="fas fa-dolly"></i></button>
                                    <button onclick="deleteFile('${item.path}', ${isDir})" class="bg-gray-800 text-white p-2 rounded-full hover:bg-red-500" title="حذف"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        `;
                    }).join('');
                } catch (error) {
                    console.error('Error:', error);
                    showAlert('حدث خطأ في الخادم', 'error');
                }
            }

            function showCreateFolderModal() {
                document.getElementById('new-folder-name').value = '';
                document.getElementById('create-folder-modal').style.display = 'flex';
            }

            async function createFolder() {
                const name = document.getElementById('new-folder-name').value.trim();
                if (!name) return;
                
                try {
                    const res = await fetch(`${API_BASE}/fs/mkdir`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify({ dir: currentFolderPath, name })
                    });
                    const result = await res.json();
                    if (result.success) {
                        closeModal('create-folder-modal');
                        showAlert('تم إنشاء المجلد', 'success');
                        loadFiles(currentFolderPath);
                    } else {
                        showAlert(result.error, 'error');
                    }
                } catch (error) {
                    showAlert('خطأ', 'error');
                }
            }

            async function showMoveModal(sourcePath, itemName) {
                document.getElementById('move-source-path').value = sourcePath;
                document.getElementById('move-item-name').textContent = itemName;
                
                const select = document.getElementById('move-destination-select');
                select.innerHTML = '<option value="">جاري التحميل...</option>';
                document.getElementById('move-file-modal').style.display = 'flex';
                
                // جلب المجلدات المتوفرة (من الجذر)
                try {
                    const res = await fetch(`${API_BASE}/fs/list?dir=`, { headers: { 'x-admin-token': localStorage.getItem('adminToken') } });
                    const result = await res.json();
                    if (result.success) {
                        const folders = result.files.filter(f => f.isDir);
                        let opts = '<option value="">الجذر (الرئيسية)</option>';
                        folders.forEach(f => {
                            opts += `<option value="${f.path}">${f.name}</option>`;
                        });
                        select.innerHTML = opts;
                    }
                } catch(e) {
                    select.innerHTML = '<option value="">خطأ في التحميل</option>';
                }
            }

            async function moveFile() {
                const source = document.getElementById('move-source-path').value;
                const destFolder = document.getElementById('move-destination-select').value;
                const itemName = source.split('/').pop();
                const destination = destFolder ? `${destFolder}/${itemName}` : itemName;
                
                if (source === destination) {
                    closeModal('move-file-modal');
                    return;
                }

                try {
                    const res = await fetch(`${API_BASE}/fs/move`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify({ source, destination })
                    });
                    const result = await res.json();
                    if (result.success) {
                        closeModal('move-file-modal');
                        showAlert('تم النقل بنجاح وتحديث الارتباطات (إن وجدت)', 'success');
                        loadFiles(currentFolderPath);
                    } else {
                        showAlert(result.error, 'error');
                    }
                } catch (error) {
                    showAlert('خطأ', 'error');
                }
            }

            async function deleteFile(path, isDir) {
                if (!confirm(`هل أنت متأكد من حذف ${isDir ? 'هذا المجلد (وجميع محتوياته)' : 'هذا الملف'}؟\n\nتحذير: لا يمكن التراجع عن هذا الإجراء!`)) return;
                
                try {
                    const res = await fetch(`${API_BASE}/fs/delete`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-token': localStorage.getItem('adminToken')
                        },
                        body: JSON.stringify({ path })
                    });
                    const result = await res.json();
                    if (result.success) {
                        showAlert('تم الحذف', 'success');
                        loadFiles(currentFolderPath);
                    } else {
                        showAlert(result.error, 'error');
                    }
                } catch (error) {
                    showAlert('خطأ', 'error');
                }
            }

            // تعديل دالة showLinkFileModal الحالية إذا لم تكن موجودة بشكل صحيح
            function showLinkFileModal(url, type) {
                resetModal('link-file-modal');
                document.getElementById('link-file-url').value = url;
                document.getElementById('link-file-type').value = type;
                
                document.getElementById('link-file-name').textContent = url.split('/').pop();
                document.getElementById('link-file-size').textContent = type === 'image' ? 'صورة' : (type === 'video' ? 'فيديو' : 'ملف');
                
                document.getElementById('link-file-modal').style.display = 'flex';
            }

        