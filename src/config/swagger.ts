import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '1.0.0',
        info: {
            title: 'Лаборатория ИИ API',
            version: '1.0.0',
            description: 'API для учебного веб-сервиса промт-инжиниринга\n\n' +
                'Основные возможности:\n' +
                '- Генерация текста через GigaChat\n' +
                '- Генерация изображений через Kandinsky\n' +
                '- Управление классами\n' +
                '- Просмотр логов и статистики\n\n' +
                'Безопасность:\n' +
                '- CSRF токен обязателен для POST запросов\n' +
                '- Rate limit: 10 запросов в минуту\n' +
                '- Classroom code для изоляции сессий',
            contact: {
                name: 'Developer',
                email: 'dev@example.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            }
        ],
        tags: [
            { name: 'Generate', description: 'Генерация текста и изображений' },
            { name: 'Classrooms', description: 'Управление классами' },
            { name: 'Logs', description: 'Логи запросов' },
            { name: 'Stats', description: 'Статистика' },
            { name: 'CSRF', description: 'CSRF токены' }
        ]
    },
    apis: ['./src/routes/*.ts']
}

export const swaggerSpec = swaggerJsdoc(options)