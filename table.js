let StateMachine = require('./StateMachine');
let Timer = require("./Timer");
var _ = require("lodash");

var TABLESTATUS = {
    'UNGAME':0,         //没有游戏状态还从没开始过
    'SLEEP':1,            //休眠状态 没有开始（此时玩家人数不足）
    'READY':2,           //准备阶段 1秒进入下一阶段
    'GAMBLING':3,          // 抢庄阶段
    'CHIPIN':4,          //下注倍数阶段
    'GAMEING':5,          //游戏中状态
    'GAMERESULT':6,       //游戏结果阶段 5秒给客户端展示阶段
    'GAMEOVER':7,          //游戏结束 桌子解散
};
var _TABLESTATUS = [
    'UNGAME',         //没有游戏状态还从没开始过
    'SLEEP',            //休眠状态 没有开始（此时玩家人数不足）
    'READY',           //准备阶段 1秒进入下一阶段
    'GAMBLING',          // 抢庄阶段
    'CHIPIN',          //下注倍数阶段
    'GAMEING',          //游戏中状态
    'GAMERESULT',       //游戏结果阶段 5秒给客户端展示阶段
    'GAMEOVER',          //游戏结束 桌子解散
];

var timeConfig = {	
	readyTime : 5,
	resultTime : 5,
	showTime :5
}
var Instance = function(){
	this.index = 1;
}

Instance.prototype.start = function(){
	let self = this;
	this.state = this.state || new StateMachine();
	this.state.now = "UNGAME";	
	this.state.on(">UNGAME",this.UNGAME_Handler.bind(this));
	this.state.on(">SLEEP",this.SLEEP_Handler.bind(this));
	this.state.on(">READY",this.READY_Handler.bind(this));
	this.state.on(">GAMERESULT", this.GAMERESULT_Handler.bind(this));
	this.state.on(">GAMEING", this.GAMEING_Handler.bind(this));	
	this.timer = new Timer();
	
	this.timer.addSchedule("UNGAME",0,function(){
		self.state.now = "SLEEP";
	});
	this.timer.addSchedule("SLEEP",10*1000,function(){
		self.state.now = "READY";
	});
	this.timer.addSchedule("READY",20*1000,function(){
		self.state.now = "GAMEING";
	});
	this.timer.addSchedule("GAMEING",30*1000,function(){
		self.state.now = "GAMERESULT";
	});
	this.timer.addSchedule("GAMERESULT",50*1000,function(){
		console.log("GAME_OVER");
		self.timer.stop();
	});

	this.timer.onStop = function(){
		console.log("回收资源逻辑");
	};
	
	this.timer.start();
}


Instance.prototype.UNGAME_Handler = function () {
    console.log("@table UNGAME_Handler");
};

Instance.prototype.SLEEP_Handler = function () {
	console.log("@talbe SLEEP_Handler");
};


Instance.prototype.READY_Handler = function() {
	console.log("@table READY_Handler");
};

Instance.prototype.GAMERESULT_Handler = function() {
   console.log("@table GAMERESULT_Handler");
};

Instance.prototype.GAMEING_Handler = function() {
   console.log("@table GAMEING_Handler");
};


module.exports = Instance;