def handler(request): 
    headers = {
        'Content-Type': 'text/plain'
    }

    return ('Hello World!', 200, headers)
