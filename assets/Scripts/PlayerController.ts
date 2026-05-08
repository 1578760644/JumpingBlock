import { _decorator, animation, Animation, Component, EventMouse, Input, input, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

//通过鼠标左键和右键来判断方块移动一步还是两步。因为方块大小是40px，所以一步就是移动40px，两步为80px
//获取鼠标按键 0左键 1中键 2右键 event.getButton() === 0
@ccclass('PlayerController')
export class PlayerController extends Component {

    //标志位，确定是否开始跳跃
    private _startJump = false;
    //跳跃时间 下面让动画时间=跳跃时间 不需要默认值了
    private _junpTime: number;
    //跳跃计时器，当前已经花了多少时间
    private _curJunpTime = 0;
    //跳跃速度
    private _jumpSpeed = 0;
    //设置目标位置,因为通过_curJunpTime>0.2 是通过时间来控制
    //不能保证player移动的时候一定是40px，因为帧数不稳定，虽然已经算出了跳跃速度，但是不能保证每次都是这么多时间
    private _targetPos = new Vec3();
    //当前位置
    private _curPos = new Vec3();

    //获取动画组件
    @property(Animation)
    public bodyAnim: Animation = null;

    //通过_curTotalStep来定义player跳动的步数
    private _curTotalStep = 0;


    start() {
        // input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    }

    //要在GameManager里面调用次方法来判断player是否可以被控制
    public setIsCanControl(value: boolean) {
        if (value) {
            input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        } else {
            input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        }
    }

    onMouseDown(event: EventMouse) {
        if (event.getButton() == 0) {
            this.JumpByStep(1);
        } else if (event.getButton() == 2) {
            this.JumpByStep(2);
        }
    }

    //跳跃步数的方法
    JumpByStep(step: number) {
        //#region
        //直接让player像塑移动40px实现跳跃，没有优化
        //const curPos = this.node.position;
        //this.node.setPosition(curPos.x + 40 * step, curPos.y, curPos.z);
        //#endregion

        //如果在跳跃就不执行后面代码
        if (this._startJump) return;

        //动画播放,动画前置加载。把动画前置后，最开始_jumptime的默认值变得可有可无了
        // AI总结
        // 抽搐原因：是因为在 update计算位置前，访问 duration导致动画系统提前把第 0 帧的位置刷到了节点上，造成了瞬移。
        // 最佳实践：强烈建议你保持现在的写法（动画前置）。让逻辑速度去适配动画时长，这样以后策划改动画时长（比如改成 0.3 秒），你不需要动一行代码，游戏逻辑会自动适配，这是非常高级且专业的代码结构。
        this.JumpAnimState(step);

        //定义距离
        const moveLength = step * 40;
        this._startJump = true;
        this._curJunpTime = 0;
        //#region
        //利用 dt 进行插值：_jumpSpeed是你计算出的“速度 距离/秒”。
        //公式：这一帧的移动距离 = 速度 × 这一帧的时间(dt)
        //#endregion
        //速度由总共需要跳跃的 时间/距离 得出
        this._jumpSpeed = moveLength / this._junpTime;

        //先获取当前位置 这种写法也可以this.node.getPosition(this._curPos)    
        this._curPos = this.node.position;
        //目标位置，通过add方法，让Vec3向量相加add(a,b,c) b+c 赋值给a
        Vec3.add(this._targetPos, this._curPos, new Vec3(moveLength, 0, 0));
        //上面的另一种写法
        //this._targetPos = new Vec3(this._curPos.x + step * 40, this._curPos.y, this._curPos.z);

        //通过这个来保存总的步数，或者说当前步数，跳一步+1跳两步+2
        this._curTotalStep += step;

    }

    //让动画的时间与跳跃的时间保持一致,取得动画时间并设置给jumptime
    JumpAnimState(step: number) {

        //通过三元运算符来判断step是否等于1
        const animName = step == 1 ? 'JumpOneStep' : 'JumpTwoStep'
        const animState = this.bodyAnim.getState(animName); //通过getState方法选择要传递动画的名字
        //通过duration方法把动画时间设置给jumptime
        this._junpTime = animState.duration;
        this.bodyAnim.play(animName); //.play方法播放动画
    }


    //优化跳跃流程,让运动过程更平滑
    //屏幕是60帧，现实中时间的1秒，dt是从一帧到下一帧所用的时间，一般是0.0167秒
    //设置了_JunpTime为0.2，也就是让他跳一下的时候花费0.2秒 _curJunpTime大于0.2秒后就停止跳跃
    protected update(dt: number): void {
        //_startJump为true开始跳跃
        if (this._startJump) {
            //让跳跃的时间增加
            this._curJunpTime += dt;
            //_curJunpTime大于0.2秒后就停止跳跃
            if (this._curJunpTime > this._junpTime) {
                this._startJump = false;
                //强制控制落点
                this.node.setPosition(this._targetPos);

                //在每一步跳动结束后更新UI显示上面以跳动的步数
                //通过emit方法来发送自定义JumpEnd事件,把总步数传过去
                this.node.emit("JumpEnd", this._curTotalStep);
            } else {
                //正常跳跃
                const curPos = this.node.position;
                this.node.setPosition(curPos.x + this._jumpSpeed * dt, curPos.y, curPos.z);
            }
        }
    }

    protected onDestroy(): void {
        input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);

    }

    //通过此方法让游戏失败/结束后player位置重新归零,并更新步数
    public reset() {
        this.node.setPosition(0, 0, 0);
        this._curTotalStep = 0;  //这里是为了清0总步数，让程序从新从0开始判断
    }
}


