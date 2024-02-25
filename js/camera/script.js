const repoOwner = 'whatmisha';
const repoName = 'mishaivanov.ru';
const path = 'js/camera';

fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`)
    .then(response => response.json())
    .then(data => {
        const projectList = document.getElementById('project-list');
        projectList.innerHTML = '';

        data.forEach(item => {
            if (item.type === 'dir') {
                const projectUrl = `https://mishaivanov.ru/${path}/${item.name}/`;

                const link = document.createElement('a');
                link.href = projectUrl;
                link.textContent = item.name;
                link.target = '_blank';

                const listItem = document.createElement('div');
                listItem.appendChild(link);
                projectList.appendChild(listItem);
            }
        });
    })
    .catch(error => {
        console.error('Ошибка при получении данных с GitHub:', error);
        document.getElementById('project-list').textContent = 'Error loading projects';
    });
