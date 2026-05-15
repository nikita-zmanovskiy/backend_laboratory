import dotenv from "dotenv";
dotenv.config()
//
// export const config = {
//     port: Number(process.env.PORT) || 3000,
//     databaseUrl: process.env.DATABASE_URL,
//     pgSsl: process.env.PGSSL === 'true',
//     csrfToken: process.env.CSRF_TOKEN,
//     aiMock: process.env.AI_MOCK === 'false',
//     kandinsky: {
//         url: process.env.KANDINSKY_API_URL,
//         key: process.env.KANDINSKY_API_KEY,
//         secret: null
//     },
//     gigachat: {
//         clientId: process.env.GIGACHAT_CLIENT_ID || '',
//         clientSecret: process.env.GIGACHAT_CLIENT_SECRET || '',
//         authUrl: process.env.GIGACHAT_AUTH_URL || 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
//         apiUrl: process.env.GIGACHAT_API_URL || 'https://gigachat.devices.sberbank.ru/api/v1',
//     }
// }

export const config = {
    port: parseInt(process.env.PORT || '3000'),
    databaseUrl: process.env.DATABASE_URL,
    pgSsl: process.env.PG_SSL === 'true',

    gigachat: {
        clientId: process.env.GIGACHAT_CLIENT_ID || '',
        clientSecret: process.env.GIGACHAT_CLIENT_SECRET || '',
        authUrl: process.env.GIGACHAT_AUTH_URL || 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
        apiUrl: process.env.GIGACHAT_API_URL || 'https://gigachat.devices.sberbank.ru/api/v1',
    },

    aiMock: process.env.AI_MOCK === 'true' || process.env.AI_MOCK === undefined,
}