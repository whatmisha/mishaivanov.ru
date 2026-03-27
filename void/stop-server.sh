#!/bin/bash
# Остановка сервера, запущенного через start-server.sh

cd "$(dirname "$0")"
PIDFILE="server.pid"

if [ ! -f "$PIDFILE" ]; then
  echo "Файл $PIDFILE не найден. Сервер, возможно, не запускался через start-server.sh"
  exit 0
fi

PID=$(cat "$PIDFILE")
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "Сервер остановлен (PID $PID)"
else
  echo "Процесс $PID не найден (уже остановлен)"
fi
rm -f "$PIDFILE"
