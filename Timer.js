const async = require('async');

let Timer = function (updateTime, async) {
    this.reset();
    this._updateTime = updateTime * 1000 || 1000;
    this._type = async || this.TYPE.SYNC;
};

Timer.prototype.reset = function () {
    this._interval = null;
    this._onUpdateCb = null;
    this._onLateUpdateCb = null;
    this._startTime = 0;
    this._timeOffset = 0;
    this._runningTime = 0;
    this._lastUpdateTime = 0;
    this._prevInterval = 0;
    this._onStartCb = null;
    this._onStopCb = null;
    this._onPauseCb = null;
    this._onResumeCb = null;
    this._onDestroyCb = null;
    this._state = this.STATE.STOP;
    this._type = this.TYPE.SYNC;
    this._scheduleTasks = {};
};

Timer.prototype.TYPE = {
    SYNC: 0,
    ASYNC: 1
};

Timer.prototype.STATE = {
    STOP: 0,
    START: 1,
    ONSTOP: 2
};

Timer.prototype.setOffset = function (offset) {
    this._timeOffset += offset;
};

Timer.prototype.getTime = function () {
    return new Date().getTime() + this._timeOffset;
};

Timer.prototype.start = function (time) {
    if (this._interval) return;
    this._startTime = time ? this.getTime() - time : this.getTime();
    this._startTimer();
    this._onStart();
};

Timer.prototype.resetStartTime = function () {
    this._startTime = new Date().getTime();
};

//{name:name,time:time,task:function}
Timer.prototype.addSchedule = function (name, time, task) {
    this._scheduleTasks[name] = {
        name: name,
        time: time,
        task: task,
        active: true,
        once: false
    };
};
Timer.prototype.addScheduleOnce = function (name, time, task) {
    this._scheduleTasks[name] = {
        name: name,
        time: time,
        task: task,
        active: true,
        once: true
    };
};

Timer.prototype.disableSchedule = function (name) {
    let task = this._scheduleTasks[name];
    if (task) {
        task.active = false;
    }
};

Timer.prototype.enableSchedule = function (name) {
    let task = this._scheduleTasks[name];
    if (task) {
        task.active = true;
    }
};

Timer.prototype.removeSchedule = function (name) {
    delete this._scheduleTasks[name]
};

Timer.prototype.resetSchedules = function () {
    for (let i in this._scheduleTasks) {
        let task = this._scheduleTasks[i];
        task.active = true;
    }
    this.resetStartTime();
};


Timer.prototype.stop = function () {
    this._onStop();
    this._stopTimer();
    this._runningTime = 0;
    this._startTime = 0;
};

Timer.prototype.pause = function () {
    this._onPause();
    this._stopTimer();
};

Timer.prototype.resume = function () {
    if (this._interval) return;
    this._prevInterval = this._updateTime;
    this._startTimer();
    this._onResume();
};

Timer.prototype.destroy = function () {
    this._stopTimer();
    this.reset();
};

Timer.prototype.activeSchedule = function () {
    let removeTasks = [];
    for (let i in this._scheduleTasks) {
        let task = this._scheduleTasks[i];
        if (task.time >= this._lastUpdateTime - this._startTime && task.time < this._runningTime) {
            task.active && task.task();
            task.active = false;
            if (task.once) {
                removeTasks.push(task.name);
            }
        }
    }
    for (let i = 0; i < removeTasks.length; i++) {
        this.removeSchedule(removeTasks[i]);
    }
};

Timer.prototype._syncUpdate = function () {
    this._lastUpdateTime = this.getTime();
    if (!this._interval) {
        this._interval = setInterval(function () {
            let curtime = this.getTime();
            this._runningTime = curtime - this._startTime;
            this.activeSchedule();
            this._prevInterval = curtime - this._lastUpdateTime;
            if (this._onUpdateCb) {
                this._onUpdateCb(this._prevInterval / 1000.0);
            }
            if (this._onLateUpdateCb) {
                this._onLateUpdateCb(this._prevInterval / 1000.0);
            }
            this._lastUpdateTime = curtime;
        }.bind(this), this._updateTime);
    }
};

Timer.prototype._asyncUpdate = function () {
    let self = this;
    let curtime = this.getTime();
    this._state = this.STATE.START;
    this._runningTime = curtime - this._startTime;
    this._prevInterval = curtime - this._lastUpdateTime;
    async.waterfall([
        function (next) {
            if (self._onUpdateCb) {
                self._onUpdateCb(self._prevInterval / 1000.0, next);
            } else {
                next(null)
            }
        },
        function (next) {
            if (self._onLateUpdateCb) {
                self._onLateUpdateCb(self._prevInterval / 1000.0, next);
            } else {
                next(null)
            }
        }
    ], function (err, res) {
        if (err) {
            console.log(err);
        } else if (self._state === self.STATE.ONSTOP) {
            self._state = self.STATE.STOP;
            console.log('timer stopped')
        } else if (self._state === self.STATE.STOP) {
            console.log('timer stopped')
        } else {

            let curtime1 = this.getTime();
            let curinterval = curtime1 - self._lastUpdateTime;
            let delta = self.updateTime - curinterval;
            if (delta > 0) {
                setTimeout(function () {
                    self._lastUpdateTime = this.getTime();
                    self._asyncUpdate();
                }, delta);
            } else {
                self._lastUpdateTime = this.getTime();
                self._asyncUpdate();
            }
        }
    })
};

Timer.prototype._startTimer = function () {
    if (this._type === this.TYPE.SYNC) {
        this._syncUpdate();
    } else if (this._type === this.TYPE.ASYNC) {
        let interval = setInterval(function () {
            if (this._state === this.STATE.STOP) {
                this._asyncUpdate();
                clearInterval(interval);
            }
        }.bind(this), Math.min(100, this._updateTime / 2));
        setTimeout(function () {
            if (interval) {
                clearInterval(interval);
            }
        }, this._updateTime * 2)
    }
};

Timer.prototype._stopTimer = function () {
    if (this._type === this.TYPE.SYNC && this._interval) {
        clearInterval(this._interval);
    }
    if (this._type === this.TYPE.ASYNC) {
        this._state = this.STATE.ONSTOP;
    }
};

Timer.prototype._onStart = function () {
    this._onStartCb && this._onStartCb();
};

Timer.prototype._onResume = function () {
    this._onResumeCb && this._onResumeCb();
};

Timer.prototype._onStop = function () {
    this._onStopCb && this._onStopCb();
};

Timer.prototype._onPause = function () {
    this._onPauseCb && this._onPauseCb();
};

Timer.prototype._onDestroy = function () {
    this._onDestroyCb && this._onDestroyCb();
};

Object.defineProperty(Timer.prototype, 'updateTime', {
    set: function (v) {
        this.updateTime = v;
        this.pause();
        this.resume();
    },
    get: function () {
        return this._updateTime;
    }
});

Object.defineProperty(Timer.prototype, 'runningTime', {
    get: function () {
        return this._runningTime;
    }
});

Object.defineProperty(Timer.prototype, 'onStart', {
    set: function (cb) {
        this._onStartCb = cb;
    }
});

Object.defineProperty(Timer.prototype, 'onStop', {
    set: function (cb) {
        this._onStopCb = cb;
    }
});

Object.defineProperty(Timer.prototype, 'onPause', {
    set: function (cb) {
        this._onPauseCb = cb;
    }
});

Object.defineProperty(Timer.prototype, 'onResume', {
    set: function (cb) {
        this._onResumeCb = cb;
    }
});

Object.defineProperty(Timer.prototype, 'onDestroy', {
    set: function (cb) {
        this._onDestroyCb = cb;
    }
});

Object.defineProperty(Timer.prototype, 'onUpdate', {
    set: function (cb) {
        this._onUpdateCb = cb;
    }
});

Object.defineProperty(Timer.prototype, 'onLateUpdate', {
    set: function (cb) {
        this._onLateUpdateCb = cb;
    }
});

module.exports = Timer;
