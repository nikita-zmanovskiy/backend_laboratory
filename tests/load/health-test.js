import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 10,         // 10 вирт пользователей
    duration: '30s',
}

export default function () {
    const res = http.get('http://localhost:3000/health')
    check(res, {
        'status is 200': (r) => r.status === 200,
        'status is ok': (r) => JSON.parse(r.body).status === 'ok',
    })
    sleep(1)
}