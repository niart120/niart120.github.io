class RNG{
	constructor(seed){
        this.carry = 0
        this.register = 0
        this.accum = 0
        this.rand = seed
    }

    nextrand(){
        this.lsfr();
        this.bitoperation();
        return this.rand;
    }

    lsfr(){
        const temp = 1 & (~((this.register>>8)^(this.register>>9)));
        this.carry = this.register>>15;
        this.register = (this.register<<1) & 0xFFFF | temp;
	}

    bitoperation(){
        let temp = (this.register>>8) + 0x22 + this.carry;
        this.carry = temp>>8;
        temp &= 0xFF;
        temp += (this.register&0xFF)+this.carry;
        this.carry = temp>>8;
        temp &= 0xFF;
        temp ^= 0x5A;
        this.accum += temp + this.carry;
        this.accum &= 0xFF;

        this.rand ^= this.accum;
    }
}

class RNGMap{
	constructor(seed){

		const r = new RNG(seed);
		const INITSTATE = (r.register<<8)|r.accum

		this.rands = new Array();
		this.rands.push(seed);

		const s = new Set([INITSTATE]);

		while (true){
		    const rand = r.nextrand();
		    const state = (r.register<<8)|r.accum;
		    if (s.has(state)) break;
		    this.rands.push(rand);
		    s.add(state);
		}

	}

    get_omikujirands(binmode){
        if(binmode){
        	const binmapping = ((p)=>{
        		(p>>4)<0xB ? 1:0
        	});
            return this.rands.slice().map(bitmapping);
        }else{
            const omikuji = (p)=>{
                p>>=4;
                if (p<0x5)return 0;
                if (p<0xB)return 1;
                return 2;
            }
            return this.rands.slice().map(omikuji);
        };
    }

    get_modrands(m){
    	const mod = ((p)=>p%m);
    	return this.rands.slice().map(mod);
    }
}

function main(){
	$('#specifyaddr').on('click',domSpecifyModal);
	$('#checkencount').on('click',domCheckEncount);
}

function domSpecifyModal(){
	const addrs = specifyaddr();
	const modal = $('#specifyModal').find('.modal-body');
	let result = '';

	if(Number(addrs.length)===0){
		result = '<p>乱数列上の位置を特定できませんでした</p><p>入力が正しいかを確認してください</p>';
	}else{
		for (let i=0; i<addrs.length; i++){
			result += "<p>"+(i+1)+"個目:"+addrs[i]+"</p>";
		}
	}
	modal.html(result);
	$('#specifyModal').modal('show');
}

function specifyaddr(){
	const seed = Number($('#specifyseed').val());
	const size = Number($('#size').val());
	const rawinfo = Number($('#omikuji').val());

	//hashtableの準備
	const rngmap = new RNGMap(seed);
	const omikuji_table = rngmap.get_omikujirands();

	//検索用ハッシュテーブルの作成
	const rnghashes = makeRngHashtable(omikuji_table);

	//hash検索用にデータを変換
	const rnginfo = convertOmikujiToRnginfo(rawinfo);

	//検索
	const result = new Array();
	let idx = 0
	while(true){
		idx = rnghashes.indexOf(rnginfo,idx);
		if(Number(idx)===-1)break;
		result.push(idx+size);
		idx++;
	}
	return result;
}

function makeRngHashtable(omikuji_table){
	const rnghashes = new Array();
	let hash = 0;
	
	for (let i = 0; i<size; i++) {
		hash <<= 2;
		hash |= omikuji_table[i];
	}
	rnghashes.push(hash);

	const mask = (1<<(2*size))-1;
	for (let i=size;i<omikuji_table.length;i++){
		hash <<= 2;
		hash &= mask;
		hash |= omikuji_table[i];
		rnghashes.push(hash);
	}

	return rnghashes;
}

function convertOmikujiToRnginfo(rawinfo){
	let rnginfo = 0;
	rawinfo = rawinfo.toString();
	for (let i = 0;i<rawinfo.length;i++) {
		rnginfo<<=2;
		const r_i = Number(rawinfo.charAt(i));
		rnginfo |= r_i;
	}
	return rnginfo;
}

function domCheckEncount(){
	const encountinfo = checkEncount();
	const modal = $('#encountModal').find('.modal-body');
	let result = '';
	if (Number(encountinfo["majin"])===-1 || Number(encountinfo["rare"]===-1)){
		result += '<p>検索に失敗しました.</p>'
	}else{
		result += '<p>魔人遭遇まであと'+(encountinfo["majin"])+'消費';
		result += '<p>レアエンカ遭遇まであと'+(encountinfo["rare"])+'消費';
	}
	modal.html(result);
	$('#encountModal').modal('show');
}

function checkEncount(){
	const seed = Number($('#checkerseed').val());
	const addr = Number($('#addr').val());
	const rngmap = new RNGMap(seed);
	const rngtable = rngmap.rands;
	const rnglowertable = rngmap.get_modrands(16);

	let majin = Number(rngtable.indexOf(0x00,addr)) - addr;
	//魔人判定を見越してaddr+1
	let rare = Number(rnglowertable.indexOf(0x0,addr+1)) - addr -1;

	if (majin<0 || rare <0) return {"majin":-1,　"majin_target": "", "rare":-1};

	//もし魔人判定を踏んだ先がレアエンカなら再計算
	while(majin===rare) rare = rnglowertable.indexOf(0x0,addr+rare+2)-addr-1;
	return {"majin":majin,　"majin_target": "", "rare":rare};
}

$(function(){
	main();
});