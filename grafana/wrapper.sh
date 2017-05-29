#!/bin/bash
(sleep 20s && /add_datasources.sh) &
exec /run.sh