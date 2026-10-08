import {catalogItems} from '../catalog-model.js';
export function heroOptions(data){return catalogItems(data).filter(x=>x._kind!=='community'&&x.image).map(x=>({value:x.key,label:x.name+' · '+({cities:'城市',countries:'地區',themes:'主題'}[x._kind]||'清單')}));}
export function registerHeroPicker(CMS,h,createClass){
 CMS.registerWidget('hero-list',createClass({
  getInitialState(){return {options:[],query:'',loading:true,error:''}},
  componentDidMount(){this.live=true;this.load()},
  componentWillUnmount(){this.live=false},
  async load(){this.setState({loading:true,error:''});try{const r=await fetch('../data.json',{cache:'no-store'});if(!r.ok)throw Error();const options=heroOptions(await r.json());if(this.live)this.setState({options,loading:false});}catch{if(this.live)this.setState({loading:false,error:'暫時無法載入清單，請重試；原選擇不會改變。'});}},
  render(){const {value,forID,onChange}=this.props;const {options,query,loading,error}=this.state;const shown=options.filter(x=>x.value===value||x.label.toLowerCase().includes(query.toLowerCase()));const style={width:'100%',padding:'12px',marginBottom:'8px',border:'1px solid #ccd4dd',borderRadius:'6px',background:'#fff',color:'#243532'};
   return h('div',{},h('input',{type:'search',value:query,placeholder:'輸入城市或主題名稱搜尋',style,'aria-label':'搜尋主圖清單',onChange:e=>this.setState({query:e.target.value})}),
    h('select',{id:forID,value:value||'',disabled:loading||!!error,style,onChange:e=>onChange(e.target.value)},h('option',{value:''},loading?'正在載入…':'選擇首頁主圖清單'),value&&!options.some(x=>x.value===value)?h('option',{value},'目前選擇（未公開或無封面）：'+value):null,...shown.map(x=>h('option',{key:x.value,value:x.value},x.label))),
    h('small',{},error||'顯示已發布且有封面的清單。剛新增的清單請等網站發布完成後重新載入。'),
    h('button',{type:'button',disabled:loading,onClick:()=>this.load(),style:{marginLeft:'10px'}},'重新載入'));
  }
 }));
}
