#!/bin/bash

# This script should be run with sudo.

systemctl daemon-reload
systemctl enable numberscope.service
