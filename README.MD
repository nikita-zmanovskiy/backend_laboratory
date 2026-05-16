для запуска npm i 
npm run dev 

нужно скачать PostgreSQL 15+ (если нет)

создать базу данных в sql с помощью запроса через pgAdmin 4:
1. Откройте pgAdmin 4 и подключитесь к серверу:
Запусте pgAdmin 4
В левой панели раскройте Servers - PostgreSQL
Введите пароль (тот что задали при установке PostgreSQL)

2. Создайте базу данных:
Правый клик на Databases, Create, Database
Введите имя: ai_lab
Нажмите Save
3. Создайте пользователя:
Правый клик на Login/Group Roles потом Create потом Login/Group Role
Вкладка General:
Name: ai_lab_user
Вкладка Definition:
Password: admin
Вкладка Privileges:
Поставьте галочку Can login? = Yes
Нажми Save
4. Выдайте права пользователю на базу:
   Правый клик на базе ai_lab потом Properties
Вкладка Security
Нажмите + добавить
Выберите ai_lab_user в поле Grantee
В поле Privileges поставьте ALL
Нажмите Save


в корень проекта нужно добавить файл .env в котором такие значения 
Сервер
PORT=3000
NODE_ENV=development

База данных
DATABASE_URL=postgresql://ai_lab_user:admin@localhost:5432/ai_lab
PGSSL=false

GigaChat API (получить на https://developers.sber.ru/)
GIGACHAT_CLIENT_ID=ваш_client_id
GIGACHAT_CLIENT_SECRET=ваш_client_secret
GIGACHAT_AUTH_URL=https://ngw.devices.sberbank.ru:9443/api/v2/oauth
GIGACHAT_API_URL=https://gigachat.devices.sberbank.ru/api/v1

AI_MOCK=false



для теста нагрузки, заменить тесты в package.json 
"test:load:health": "k6 run tests/load/health-test.js",
"test:load:csrf": "k6 run tests/load/csrf-test.js",
"test:load:generate": "k6 run tests/load/generate-test.js",
"test:load": "npm run test:load:health && npm run test:load:csrf && npm run test:load:generate"