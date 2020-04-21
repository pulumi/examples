import azure.functions as func

def main(req: func.HttpRequest) -> func.HttpResponse:
    body = 'Hello {}'.format(req.params.get('name'))
    return func.HttpResponse(
        body,
        status_code=200)
