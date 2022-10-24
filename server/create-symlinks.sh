#!/bin/bash
ln -s /home/scope/repos/backscope/server/numberscope.conf /etc/nginx/sites-available/numberscope.conf
ln -s /etc/nginx/sites-available/numberscope.conf /etc/nginx/sites-enabled/numberscope.conf
ln -s /home/scope/repos/backscope/server/numberscope.service /etc/systemd/system/numberscope.service
