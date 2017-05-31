#!/bin/bash
(sleep 15s && /add_datasources.sh) &
exec /run.sh