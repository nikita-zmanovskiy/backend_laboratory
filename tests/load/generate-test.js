import http from 'k6/http';
import { check, sleep } from 'k6';

const CLASSROOM_CODE = 'NZNNXP' //запустить сервер, создать самому комнату и сюда заменить и только потом запускать проверку

export const options = {
    stages: [
        { duration: '30s', target: 5 },
        { duration: '30s', target: 15 },
        { duration: '30s', target: 30 },
        { duration: '30s', target: 0 },
    ],
}

export default function () {
    const tokenRes = http.get('http://localhost:3000/api/csrf/token?session_id=k6-' + __VU + '-' + __ITER),
     token = JSON.parse(tokenRes.body).csrf_token

    const res = http.post(
        'http://localhost:3000/api/generate',
        JSON.stringify({
            mode: 'text',
            prompt: 'Say hello',
            session_id: 'k6-' + __VU + '-' + __ITER,
        }),
        {
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': token,
                'x-classroom-code': CLASSROOM_CODE,
            },
        }
    )

    check(res, {
        'status is 200': (r) => r.status === 200,
    })

    sleep(3) //перед следующим запросом задержка
}