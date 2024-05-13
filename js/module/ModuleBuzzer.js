/**
 * @typedef TypeBuzzerStart
 * @property {Number} freq     - частота
 * @property {Number} numRep   - количество повторений [1...n]
 * @property {Number} pulseDur - длительность звучания в ms [50<=x<infinity]
 * @property {Number} prop     - пропорция ЗВУК/ТИШИНА на одном периоде [0<x<=1]
*/  
/**
 * @class
 * Класс ClassBuzzer реализует логику работы пьезодатчика.
 */
class ClassBuzzer extends ClassActuator {
    /**
     * @typedef BuzzerOptsType
     * @property {[Pin]} pins - массив с одним пином
     * @property {number} maxFreq - минимальная частота на которой пьезо будет издавать звук
     * @property {number} minFreq
     */
    /**
     * @constructor
     * @param {BuzzerOptsType} _opts 
     */
    constructor(_opts, _actuatorProps) {
        this.name = 'ClassBuzzer';                                  //переопределение имени класса
        ClassActuator.apply(this, [_opts, _actuatorProps]);   //вызов родительского конструктора
        this._MinFreq = _opts.minFreq;
        this._MaxFreq = _opts.maxFreq;

        if (typeof this._MaxFreq !== 'number' || 
            typeof this._MinFreq !== 'number') throw new Error('Invalid range values'); 

        this.InitTasks();
    }
    /*******************************************CONST********************************************/
    /**
     * @const
     * @type {number}
     * Константа ERROR_CODE_ARG_VALUE определяет код ошибки, которая может произойти
     * в случае передачи не валидных данных
     */
    static get ERROR_CODE_ARG_VALUE() { return 10; }
    /**
     * @const
     * @type {string}
     * Константа ERROR_MSG_ARG_VALUE определяет сообщение ошибки, которая может произойти
     * в случае передачи не валидных данных
     */
    static get ERROR_MSG_ARG_VALUE() { return `ERROR>> invalid data. ClassID: ${this.name}`; }
    /*******************************************END CONST*************************************** */
    /**
    * @method
    * Инициализирует стандартные таски модуля
    */
    InitTasks() {
        this._Channels[0].AddTask('PlaySound', (opts) => {
            // console.log(this);
            //проверка и валидация аргументов 
            ['freq', 'numRep', 'pulseDur', 'prop'].forEach(property => {
                if (typeof opts[property] !== 'number' || opts[property] < 0) throw new Error('Invalid args');
            });
            opts.prop = E.clip(opts.prop, 0, 1); 
            opts.pulseDur = E.clip(opts.pulseDur, 0, 2147483647);  //ограничение длины импульса максимальным знчением, которое может быть передано в setTimeout

            /*-сформировать двойной звуковой сигнал */
            const freq = opts.freq;
            let Thi = opts.pulseDur; //длительность звукового сигнала
            let Tlo = Math.floor(opts.pulseDur*(1 - opts.prop)/opts.prop); //длительность паузы
            count = opts.numRep*2;                                     //количество полупериодов(!) звукового сигнала
            let beep_flag = true;

            let beep_func = () => {
                --count;
                if (count > 0) {
                    if (beep_flag) {
                        this.Off();                                           //выключить звук
                        this._Interval = setTimeout(beep_func, Tlo);          //взвести setTimeout
                    } else {
                        this.On(freq);                                     //включить звук
                        this._Interval = setTimeout(beep_func, Thi);          //взвести setTimeout
                    }
                    beep_flag = !beep_flag;
                } else {
                    this.ResolveTask(0);               //завершение таска
                };
            };

            this.On(freq) //включить звуковой сигнал
            this._Interval = setTimeout(beep_func, Thi);
        });

        this._Channels[0].AddTask('BeepOnce', function(freq, dur) {
            if (!Number.isInteger(dur) || dur < 0) throw new Error('Invalid args');

            this.On(freq);
            setTimeout(() => {
                this.Off();
                this.ResolveTask(0);
            }, dur);
        });    

        this._Channels[0].AddTask('BeepTwice', (freq, dur) => {
            // console.log(freq, dur);
            if (!Number.isInteger(dur) || dur < 0) throw new Error('Invalid args');
        
            this.On(freq);          //вкл звук 

            setTimeout(() => {
                this.Off();
            }, dur);                //выкл звук через один полупериод

            setTimeout(() => {
                this.On(freq);
            }, dur*2);              //вкл звук через два полупериода

            setTimeout(() => {
                this.Off();         //выкл через 3 полупериода
                setTimeout(() => { this.ResolveTask(0); }, dur*4);  //деактивировать таск через 2 полных периода
            }, dur*3);
        });
    }
    //_val - коэффициент от 0 до 1
    On(_chNum, _val) {
        if (typeof _val !== 'number') throw new Error();
        _val = E.clip(_val, 0, 1);
        const proportion = (x, in_min, in_max, out_min, out_max) => {
            return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
        }
        if (this._IsChOn[_chNum]) this.Off();
        let freq = proportion(_val, 0, 1, this._MinFreq, this._MaxFreq);
        analogWrite(this._Pins[0], 0.5, { freq : freq }); //включить звуковой сигнал
    }

    Off() {
        digitalWrite(this._Pins[0], 1);
        this._IsChOn[0] = false;
    }
}

exports = ClassBuzzer;
