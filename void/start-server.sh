#!/bin/bash
# Запуск статического сервера на http://localhost:3000/
# Сервер работает в фоне и продолжит работать после закрытия терминала/Cursor.

cd "$(dirname "$0")"
PIDFILE="server.pid"
LOGFILE="server.log"

if [ -f "$PIDFILE" ]; then
  OLD_PID=$(cat "$PIDFILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Сервер уже запущен (PID $OLD_PID). Остановите его: ./stop-server.sh"
    exit 1
  fi
  rm -f "$PIDFILE"
fi

echo "Запуск сервера на http://localhost:3000/"
nohup npx serve -l 3000 . >> "$LOGFILE" 2>&1 &
echo $! > "$PIDFILE"
# Отвязываем от оболочки — сервер продолжит работать после закрытия Cursor/терминала
disown 2>/dev/null || true
sleep 1
if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "Сервер запущен. PID: $(cat "$PIDFILE"). Лог: $LOGFILE"
  echo "Откройте: http://localhost:3000/"
else
  echo "Не удалось запустить сервер. Проверьте $LOGFILE"
  exit 1
fi
