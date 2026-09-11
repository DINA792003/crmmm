import httpx
import json
import asyncio
import sys
from jose import jwt

sys.stdout.reconfigure(encoding='utf-8')

token = jwt.encode(
    {'id': 'cmtwq5ggi007ga6g6tudaiqod', 'email': 'admin@dctcrm.com', 'tenantId': 'cmtwq5gcp0000a6g6xrsrwbc3'},
    'dct-crm-jwt-secret-key-2024',
    algorithm='HS256'
)

async def test():
    async with httpx.AsyncClient(timeout=15.0) as c:
        tests = [
            'today leads',
            'total leads',
            'lead status',
            'total project',
            'bookings count',
            'total customers',
            'this month revenue',
            'pending payments',
            'unit availability',
            'show summary',
        ]
        for msg in tests:
            try:
                r = await c.post(
                    'http://localhost:8001/chat',
                    json={'message': msg},
                    headers={'Authorization': f'Bearer {token}'}
                )
                data = r.json()
                resp = data.get('response', 'N/A')
                rtype = data.get('response_type', 'N/A')
                print(f'[{msg}] => {rtype}: {resp[:150]}')
            except Exception as e:
                print(f'[{msg}] => ERROR: {e}')

asyncio.run(test())
