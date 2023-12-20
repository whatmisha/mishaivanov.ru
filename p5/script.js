const repoOwner = 'whatmisha'; // Замените на ваше имя пользователя на GitHub
const repoName = 'mishaivanov.ru';  // Замените на название вашего репозитория
const path = 'p5'; // Путь к папке в вашем репозитории

fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`)
    .then(response => response.json())
    .then(data => {
        const projectList = document.getElementById('project-list');
        projectList.innerHTML = '';

        data.forEach(item => {
            if (item.type === 'dir') {
                const link = document.createElement('a');
                link.href = item.html_url;
                link.textContent = item.name;
                link.target = '_blank'; // Открывать в новой вкладке

                const listItem = document.createElement('div');
                listItem.appendChild(link);
                projectList.appendChild(listItem);
            }
        });
    })
    .catch(error => {
        console.error('Ошибка при получении данных с GitHub:', error);
        document.getElementById('project-list').textContent = 'Ошибка загрузки проектов.';
    });
