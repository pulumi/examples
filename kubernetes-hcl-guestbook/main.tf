terraform {
  required_providers {
    kubernetes = "~> 2.0"
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}

#
# REDIS LEADER.
#

resource "kubernetes_deployment_v1" "redis_leader" {
  metadata {
    name = "redis-leader"
  }

  spec {
    selector {
      match_labels = {
        app = "redis-leader"
      }
    }

    template {
      metadata {
        labels = {
          app = "redis-leader"
        }
      }

      spec {
        container {
          name  = "redis-leader"
          image = "redis"

          resources {
            requests = {
              cpu    = "100m"
              memory = "100Mi"
            }
          }

          port {
            container_port = 6379
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "redis_leader" {
  metadata {
    name = "redis-leader"
  }

  spec {
    selector = {
      app = "redis-leader"
    }

    port {
      port        = 6379
      target_port = 6379
    }
  }
}

#
# REDIS REPLICA.
#

resource "kubernetes_deployment_v1" "redis_replica" {
  metadata {
    name = "redis-replica"
  }

  spec {
    selector {
      match_labels = {
        app = "redis-replica"
      }
    }

    template {
      metadata {
        labels = {
          app = "redis-replica"
        }
      }

      spec {
        container {
          name  = "replica"
          image = "pulumi/guestbook-redis-replica"

          resources {
            requests = {
              cpu    = "100m"
              memory = "100Mi"
            }
          }

          # If your cluster config does not include a dns service, then to instead access an
          # environment variable to find the leader's host, change "dns" to "env".
          env {
            name  = "GET_HOSTS_FROM"
            value = "dns"
          }

          port {
            container_port = 6379
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "redis_replica" {
  metadata {
    name = "redis-replica"
  }

  spec {
    selector = {
      app = "redis-replica"
    }

    port {
      port        = 6379
      target_port = 6379
    }
  }
}

#
# FRONTEND.
#

resource "kubernetes_deployment_v1" "frontend" {
  metadata {
    name = "frontend"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "frontend"
      }
    }

    template {
      metadata {
        labels = {
          app = "frontend"
        }
      }

      spec {
        container {
          name  = "frontend"
          image = "pulumi/guestbook-php-redis"

          resources {
            requests = {
              cpu    = "100m"
              memory = "100Mi"
            }
          }

          # If your cluster config does not include a dns service, then to instead access an
          # environment variable to find the leader's host, change "dns" to "env".
          env {
            name  = "GET_HOSTS_FROM"
            value = "dns"
          }

          port {
            container_port = 80
          }
        }
      }
    }
  }
}

# The frontend service requires a cluster that can provision a load balancer, such as one
# with the MetalLB addon enabled on minikube.
resource "kubernetes_service_v1" "frontend" {
  metadata {
    name = "frontend"
  }

  spec {
    type = "LoadBalancer"

    selector = {
      app = "frontend"
    }

    port {
      port = 80
    }
  }
}

output "frontend_ip" {
  value = kubernetes_service_v1.frontend.status[0].load_balancer[0].ingress[0].ip
}
