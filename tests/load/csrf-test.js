import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 5,
    duration: '20s',
}

export default function () {
    const res = http.get('http://localhost:3000/api/csrf/token?session_id=load-test')
    check(res, {
        'status is 200': (r) => r.status === 200,
        'has token': (r) => JSON.parse(r.body).csrf_token !== undefined,
    })
    sleep(1)
}