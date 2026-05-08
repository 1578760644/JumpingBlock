import { _decorator, Component, instantiate, Label, Node, Prefab } from 'cc';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

//通过枚举的方法来保存格子的类型
//枚举正好第一个值为0，第二个值为1
enum BlockType {
    BT_NONE,
    BT_WHITE
}

//定义游戏状态
enum GameState {
    GS_MENU,
    GS_PLAYING
}


//通过prefeb生成随机地图，有如下几个条件：
//1.格子有两种类型可见格子和空格子。后面通过判断player落在哪个格子上，落在空格子上就失败
//2.因为格子只能跳1步或者2步，所以生成的格子不能连续两个为空，否则会跳不过去
@ccclass('GameManager')
export class GameManager extends Component {

    //创建prefab属性，在引擎把box添加到空节点GameManager里面
    @property(Prefab)
    public boxPrefab: Prefab = null;

    //设置路的长度
    @property
    public roadLength = 100;

    //引用PlayerController
    @property(PlayerController)
    public PlayerController: PlayerController = null;

    //通过引用node节点来实现UI的出现和隐藏
    @property(Node)
    public startMenu: Node = null;

    //收集总步数完成后需要更新到组件
    @property(Label)
    public stepLabel: Label = null;

    //获取UI step的node节点
    @property(Node)
    public step: Node | null = null;

    //通过一个空数组保存格子类型
    private _road: BlockType[] = [];

    start() {
        this.setCurState(GameState.GS_MENU)

        //通过 .node.on 节点来监听事件,最后一个 this只是一个“路标”，它自己不会作为数据传进去
        this.PlayerController.node.on('JumpEnd', this.onJumpEnd, this)
    }
    
    //监听了就一定要销毁，防止内存泄露
    protected onDestroy(): void {
        if (this.PlayerController) {
            this.PlayerController.node.off('JumpEnd', this.onJumpEnd, this)
        }
    }

    //设置开始游戏的状态切换
    setCurState(value: GameState) {
        if (value === GameState.GS_MENU) {
            this.PlayerController.reset(); //每次生成路之前先重置player位置
            this.stepLabel.string = '0'; //把UI步数提示更新为0
            this.generateRoad(); //生成路
            //禁用player controller的控制有两种方式1.取消控制绑定 2.用bool状态判断是否可以被控制
            this.PlayerController.setIsCanControl(false);
            this.startMenu.active = true; //active方法来判断是否勾选node
            this.step.active = false; //游戏开始时隐藏step标签
        } else if (value === GameState.GS_PLAYING) {
            this.PlayerController.setIsCanControl(true);
            this.startMenu.active = false; //active方法来判断是否勾选node
            this.step.active = true;
        }
    }

    //当开始按钮被点击触发此方法
    onStartButtonClick() {
        //触发进入游戏状态
        this.setCurState(GameState.GS_PLAYING)
    }

    //收集总步数的方法
    //参数是value也就是总步数，这里的参数就是用来收集PlayerController里自定义JumpEnd事件传过来的参数
    onJumpEnd(value: number) {
        //通过.string方法来修改label的值,因为值是number 需要用.toString()方法强制类型转换赋值给label
        this.stepLabel.string = value.toString();

        this.checkResult(value);
    }

    //通过此方法来判断player是否走到底，从而游戏结束
    checkResult(totalStep: number) {
        //当总长度>=路长度的时候，游戏结束跳转回到菜单界面
        if (totalStep >= this.roadLength) {
            this.setCurState(GameState.GS_MENU)
        } else {
            //通过索引就可以判断当前的跳动位置是不是等于 BT_NONE的格子，如果等于那么游戏失败,跳回到主菜单
            if (this._road[totalStep] == BlockType.BT_NONE) {
                this.setCurState(GameState.GS_MENU)
            }
        }
    }

    //通过for循环生成路的方法，生成的路是挂载在GameManager子节点下的
    generateRoad() {
        //通过removeAllChildren方法来消除子节点，因为场景每次加载都需要重新生成路
        this.node.removeAllChildren();
        this._road = []; //方法开始要保证_road数组为空
        //通过.push方法把第一个格子添加为白格子
        this._road.push(BlockType.BT_WHITE);

        //使用随机数生成0代表空格子 1代表白格子
        //这里判断生成方块的类型
        for (let i = 1; i < this.roadLength; i++) {
            //判断前一个格子是否为空，如果是空的就只能生成一个小白块
            if (this._road[i - 1] === BlockType.BT_NONE) {
                this._road.push(BlockType.BT_WHITE)
            } else {
                //随机数random方法生成从0-1之间的随机小数，在通过round方法给他四舍五入取整，最后只会得到0和1两个数
                this._road.push(Math.round(Math.random()))
            }
        }

        //判断检测第一个格子是白格子，所以往后面40px开始生成格子
        for (let j = 1; j < this.roadLength; j++) {
            if (this._road[j] == BlockType.BT_WHITE) { //这里判断road[1] 刚好是上面enum的 BT_WHITE
                //通过调用instantiate方法来实例化小白块
                const box = instantiate(this.boxPrefab);
                box.setParent(this.node); //把prefab绑定在了GameManager下方
                box.setPosition(j * 40, 0, 0) //初始位置0是小白块，从40px后面开始生成
            }
        }

    }

    update(deltaTime: number) {

    }
}


