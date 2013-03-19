#!/bin/bash

CONF_FILE="ctl.conf"

# default variables..
#  -- log files
LOG_DIR="/tmp"

# -- pid files
PID_FILE_DIR="/tmp"

# -- polling interval
POLL_INTERVAL_SECS=5


if [ -f $CONF_FILE ]; then
  source $CONF_FILE
fi

# these values have no default, and must come from the configuration file
if [[ -z "$APP" ]]; then
  echo "# $0 needs variable 'APP' to be set in configuration file '$CONF_FILE'"
  exit
fi
if [[ -z "$ID" ]]; then
  echo "# $0 needs variable 'ID' to be set in configuration file '$CONF_FILE'"
  exit
fi

APP_NAME="$APP (#$ID)"
CTL_NAME="Keepalive for $APP_NAME"

app_id="$ID-$APP"

errlog="${LOG_DIR}/${ID}-error.log"
applog="${LOG_DIR}/${ID}-application.log"
ctllog="${LOG_DIR}/${ID}-ctl.log"


PID_FILE_CMD="${PID_FILE_DIR}/$app_id-pid.cmd"
PID_FILE_CTL="${PID_FILE_DIR}/$app_id-pid.ctl"

cmd=$1

function iso_date() {
  date "+%Y-%m-%d %H:%M:%S"
}

function usage() {
  echo "Usage: $0 start|stop|restart|show"
}

function get_pid() {
  which="$1"
  if [[ "cmd" == "$which" ]]; then
    file=$PID_FILE_CMD
  elif [[ "ctl" == "$which" ]]; then
    file=$PID_FILE_CTL
  fi
  if [[ -f "$file" ]]; then
    cat $file 
  else
    echo ""
  fi
}

function show() {
  pid_ctl=$(get_pid "ctl")
  pid_cmd=$(get_pid "cmd")
  if [[ -z "$pid_cmd" ]] ; then
    echo "Not running: $APP_NAME"
  else
    echo "Up and running: $APP_NAME (pid $pid_cmd)"
  fi
  if [[ -z "$pid_ctl" ]] ; then
    echo "Not running: $CTL_NAME"
  else
    echo "Up and running $CTL_NAME (pid $pid_ctl)"
  fi
}

function check_pid() {
  pid=$1
  status=$(ps -p $pid | egrep $pid)
  if [[ -z "$status" ]]; then # TODO: check for other problems too
    echo "dead"
  else
    echo "alive"
  fi
}

function watch_pid() {
  pid=$1
  echo "[ $(iso_date) ] Keeping pid $pid alive, running app: [ $APP_NAME ]" > $ctllog
  while [[ "alive" == "$(check_pid $pid)" ]]; do
    sleep $POLL_INTERVAL_SECS
  done
  echo "[ $(iso_date) ] $APP_NAME (pid $pid) died. Bringing it up again" > $ctllog
  node $APP > $applog 2> $errlog &
  cmd_pid="$!"
  watch_pid $cmd_pid &
  ctl_pid="$!"
  echo "[ $(iso_date) ] Restarted app: $APP_NAME" > $ctllog
  persist_pids $ctl_pid $cmd_pid &
}


function persist_pids() {
  echo "[ $(iso_date) ] Writing pids for $APP_NAME: ctl: $1, cmd: $2" > $ctllog
  echo "$1" > $PID_FILE_CTL
  echo "$2" > $PID_FILE_CMD
}

function purge_pid() {
  which="$1"
  if [[ "cmd" == "$which" ]]; then
    file=$PID_FILE_CMD
  elif [[ "ctl" == "$which" ]]; then
    file=$PID_FILE_CTL
  else
    # unknown token
    echo "purge_pid: unknown pid for token: [$which]"
    exit
  fi

  echo "[ $(iso_date) ] Purging $which pid for $APP_NAME" > $ctllog
  rm -f $file
}

function stop() {
  echo "[ $(iso_date) ] stopping $APP_NAME" > $applog
  pid_ctl=$(get_pid "ctl")
  pid_cmd=$(get_pid "cmd")
  if [[ -z "$pid_ctl" ]] ; then
    echo "Not running: $CTL_NAME"
  else
    kill $pid_ctl
    purge_pid "ctl"
    echo "Stopping $CTL_NAME"
  fi
  rm -f $PID_FILE_CTL

  if [[ -z "$pid_cmd" ]] ; then
    echo "Not running: $APP_NAME"
  else
    kill $pid_cmd
    purge_pid "cmd"
    echo "Stopping $APP_NAME"
  fi
  rm -f $PID_FILE_CMD
}


# parse cmd
if [[ -z "$1" ]]; then

  usage
  exit

elif [[ $cmd == "stop" ]]; then

  stop
  exit

elif [[ $cmd == "show" ]]; then

  show
  exit

elif [[ $cmd == "start" ]]; then
  pid_ctl=$(get_pid "ctl")
  pid_cmd=$(get_pid "cmd")
  if [[ -n "$pid_ctl" ]] || [[ -n "$pid_cmd" ]]; then
    echo "-- Stuff is running already:"
    $0 show
    exit
  fi
  node $APP > $applog 2> $errlog &
  cmd_pid="$!"
  watch_pid $cmd_pid &
  ctl_pid="$!"
  persist_pids $ctl_pid $cmd_pid
  echo "[ $(iso_date) ] Started app: $APP_NAME" > $applog
  echo "Started $CTL_NAME"
  echo "Started $APP_NAME"
  exit

elif [[ $cmd == "restart" ]]; then

  $0 stop
  $0 start
  exit
fi

usage
exit
