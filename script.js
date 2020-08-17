(function(){
    "use strict";

    var config = {};
    
    var template = `<div class="tmr-list__item">
        <div class="tmr-list__item__created"></div>
        <div class="tmr-list__item__controls">
            <button class="tmr-list__item__controls__removebtn"><i class="fas fa-trash"></i></button>
            <button class="tmr-list__item__controls__editbtn"><i class="fas fa-pen"></i></button>
            <button class="tmr-list__item__controls__movedownbtn"><i class="fas fa-chevron-down"></i></button>
        </div>
        <div class="tmr-list__item__titlewrap">
            <span contenteditable="" class="tmr-list__item__title2"></span>
        </div>
        <div class="tmr-list__item__timer">00:59</div>
    </div>`;

    
    var getSavedTime = function (item){
        return item.data('time') ? item.data('time') : 0;
    }
    var setSavedTime = function (item,time){
        item.data('time',time);
    }
    var addSavedTime = function (item,time){
        setSavedTime(item, getSavedTime(item) + time);
    }
    var getRunningTime = function (item){
        return item.data('running') ? (Date.now() - item.data('running')) : 0;
    }
    var setRunningStart = function (item){
        item.data('running',Date.now());
    }
    var resetRunningStart = function (item){
        item.data('running', 0);
    }

    var getSummedTime = function(item){
        return getSavedTime(item) + getRunningTime(item);
    }

    var pause = function($item){
        if(!getRunningTime($item)) return;
        addSavedTime($item, getRunningTime($item));
        resetRunningStart($item);
        $item.removeClass('active');
        saveToStorage();
    }

    var resizeTitle = function($item){
        var title = $item.find('.tmr-list__item__title2').get(0);
        // title.style.fontSize = '100%';
        var currentSize = parseFloat((title.style.fontSize.match(/(.*)%/) || ['250%', '250'])[1]);
        title.style.fontSize = Math.min(250, currentSize * (title.parentElement.offsetWidth - 20) / title.offsetWidth ) + '%';
    }

    var pauseAll = function(){
        $('.tmr-list__item').each(function(){
            var $item = $(this);
            $item.removeClass('active');
            pause($item);
        });
    }
    var play = function($item){
        setRunningStart($item);
        $item.addClass('active');
        saveToStorage();
    }    

    var formatDuration = function(ms){
        var s = Math.floor((ms / 1000) % 60);
        var m = Math.floor((ms / (1000 * 60)) % 60);
        var h = Math.floor((ms / (1000 * 60 * 60)) % 24);
        return (h ? h + ':' : '') + m.toString().padStart(2, "0") + ':' + s.toString().padStart(2, "0");
    }

    var updateItemView = function($item){
        var sum = getSummedTime($item);
        var formatted = formatDuration(sum);
        $item.find('.tmr-list__item__timer').text(formatted);
        if($item.data('created')){
            let format = 'dddd, HH:mm [Uhr]';
            if(moment().isSame(moment($item.data('created')),'day')) {
                format = '[Heute]';
            }
            else if(moment().diff($item.data('created'), 'days') > 6) {
                format = 'DD.MM.YYYY';
            }
            $item.find('.tmr-list__item__created').text(moment($item.data('created')).format(format));
            resizeTitle($item);
        }
    }

    var updateGlobalView = function(force = false){
        var sum = 0;
        $('.tmr-list__item').each(function(){
            var $this = $(this);
            sum += getSummedTime($this);
            if(force || getRunningTime($this)) updateItemView($this);
        })
        .promise()
        .done( function(){ $('.tmr-sum').text('Summe: ' + formatDuration(sum)); } );
    }

    var parseTime = function(text){
        var rgxs = [
            { pattern: /(\d+)\:(\d+)\:(\d+)/g, pos: [[1,60*60*1000],[2,60*1000],[3,1000]] },
            { pattern: /(\d+)\:(\d+)/g, pos: [[1,60*1000],[2,1000]] },
            { pattern: /(\d+(,\d+)?)h/g, pos: [[1, 60*60*1000]] },
            { pattern: /(\d+(,\d+)?)m?/g, pos: [[1, 60*1000]] }
        ];
        var match, pos, factor,  ms = 0;
        for(var i = 0; i < rgxs.length; i++){
            match = rgxs[i].pattern.exec(text)
            if(!match) continue;
            for(var ii = 0; ii < rgxs[i].pos.length; ii++){
                pos = rgxs[i].pos[ii][0];
                if(match[pos]) 
                    factor = rgxs[i].pos[ii][1];
                    ms += parseFloat(match[pos].replace(',','.')) * factor;    
            }
            return Math.floor(ms);
        }
        return ms;
    }

    var saveToStorage = function(){
        var items = Array.from(document.querySelectorAll('.tmr-list__item')).map(function(item){
            var $item = $(item);
            return {
                data: $item.data(),
                description: $item.find('.tmr-list__item__title2').html()
            }
        });

        var data = {
            items: items,
            config: config,
        };
        localStorage.setItem('tmr',JSON.stringify(data));
    };


    var loadFromStorage = function(){
        var data;
        var $newItem;
        if(!localStorage.tmr) return;
        data = JSON.parse(localStorage.tmr);


        config = data.config || {
            startTimer: 0
        };
        var items = data.items || data;
        $('.tmr-list').html('');
        for(var i = 0; i < items.length; i++){
            $newItem = $(template);
            if(items[i].data.running) $newItem.addClass('active');
            $newItem.find('.tmr-list__item__title').val(items[i].description);
            $newItem.find('.tmr-list__item__title2').html(items[i].description);
            resizeTitle($newItem);
            $newItem.data(items[i].data);
            $newItem.appendTo('.tmr-list');
        }
    }


    var ticker = setInterval(function(){
        updateGlobalView();
    },1000);

    $(document).on('click','.tmr-list__item__timer',function(e){
        var $item = $(this).closest('.tmr-list__item');
        if(getRunningTime($item)){
            pause($item);
        } 
        else {
            console.log(e);
            if(! (e.ctrlKey || e.metaKey)) pauseAll();
            play($item)
        };
    })

    $(document).on('keydown keyup change','.tmr-list__item__title2',function(){
        var $item = $(this).closest('.tmr-list__item');
        resizeTitle($item);
        saveToStorage();
    });

    $(document).on('click','.tmr-list__item__controls__editbtn',function(){
        var $item = $(this).closest('.tmr-list__item');
        var parsedTime, newTime;
        if(getRunningTime($item)){
            pause($item);
            play($item);
        }
        newTime = prompt("Enter Time", formatDuration(getSavedTime($item)));
        if(parsedTime = parseTime(newTime)){
            setSavedTime($item,parsedTime);
            if(getRunningTime($item)){
                play($item);
            }
            updateItemView($item);
        }
        saveToStorage();
    });

    $(document).on('click','.tmr-list__item__controls__removebtn',function(){
        $(this).closest('.tmr-list__item').remove();
        saveToStorage();
    });

    $(document).on('click','.tmr-list__item__controls__movedownbtn',function(){
        var $item = $(this).closest('.tmr-list__item');
        if($item.next().length){
            $item.insertAfter($item.next());
        }
        saveToStorage();
    });

    $(document).on('click','.tmr-list__addbtn',function(e){
        var $newItem = $(template);
        if(! (e.ctrlKey || e.metaKey)) pauseAll();
        
        play($newItem);
        
        $newItem.data('created',Date.now());
        $newItem.data('time',(config.startTimer || 0)*1000);
        $newItem.prependTo('.tmr-list');
        $newItem.find('.tmr-list__item__title2').focus();
        saveToStorage();
        updateItemView($newItem);
    });

    $(document).ready(function(){
        loadFromStorage();
        updateGlobalView(true);
    });

    $(window).focus(function() {
        loadFromStorage();
        updateGlobalView(true);
    });
    
    window.timer = {
        setStartTimer: function(x) {
            config.startTimer = x;
            saveToStorage();
        }
    }
})();
