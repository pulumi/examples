terraform {
  required_providers {
    google = "~> 7.0"
  }
}

resource "google_compute_network" "network" {
  name                    = "hcl-webserver-network"
  auto_create_subnetworks = true
}

resource "google_compute_firewall" "firewall" {
  name          = "hcl-webserver-firewall"
  network       = google_compute_network.network.self_link
  source_ranges = ["0.0.0.0/0"]

  allow {
    protocol = "tcp"
    ports    = ["22", "80"]
  }
}

resource "google_compute_instance" "instance" {
  name         = "hcl-webserver"
  machine_type = "e2-micro"

  metadata_startup_script = <<-EOF
    #!/bin/bash
    echo "Hello, World!" > index.html
    nohup python3 -m http.server 80 &
  EOF

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = google_compute_network.network.id

    # Must be empty to request an ephemeral IP.
    access_config {}
  }

  depends_on = [google_compute_firewall.firewall]
}

output "instance_name" {
  value = google_compute_instance.instance.name
}

output "instance_ip" {
  value = google_compute_instance.instance.network_interface[0].access_config[0].nat_ip
}
