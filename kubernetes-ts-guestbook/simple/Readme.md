# Guestbook Monitoring Assignment

## Features
- Pulumi deployment
- Prometheus monitoring
- Grafana dashboards
- ServiceMonitor
- Guestbook metrics

## Deployment

npm install
pulumi up

## Grafana

URL:
http://localhost:32000

Username:
admin

Password:
admin123

## Verify Metrics

kubectl port-forward svc/prometheus-operated 9090 -n monitoring

Open:
http://localhost:9090/targets
