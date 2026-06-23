
const e = React.createElement;

function Panel(title, content){
 return e('div',{style:{background:'#0d1b2e',border:'1px solid #1c3354',borderRadius:'12px',padding:'12px',marginBottom:'10px'}},
  e('div',{style:{color:'#ff9d2e',fontWeight:'700',marginBottom:'10px'}},title),
  content
 );
}

function App(){
 const root={background:'#07111f',color:'white',minHeight:'100vh',fontFamily:'Arial,sans-serif',padding:'10px'};
 return e('div',{style:root},
 [
  e('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#081725',padding:'12px',borderRadius:'12px',marginBottom:'10px'}},
   [
    e('div',null,'MBOGI ANGANI ✈️'),
    e('div',null,'Aviator | Leaderboard | Affiliates | Rewards | Help'),
    e('div',null,'KES 10,245.50')
   ]),
  e('div',{style:{display:'grid',gridTemplateColumns:'260px 1fr 300px',gap:'10px'}},
   [
    e('div',null,
      Panel('247 Online',e('div',null,'Live chat panel'))),
    e('div',null,[
      e('div',{style:{background:'#0b1630',borderRadius:'12px',padding:'15px',height:'360px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'72px',fontWeight:'800'}},'1.62x'),
      e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 220px',gap:'10px',marginTop:'10px'}},
      [
        Panel('Bet Amount',e('div',null,'500 KES')),
        Panel('Auto Cashout',e('div',null,'2.00x')),
        e('button',{style:{background:'#35c759',border:'none',borderRadius:'12px',fontSize:'32px',fontWeight:'700'}},'BET')
      ])
    ]),
    e('div',null,[
      Panel('All Bets',e('div',null,'Player list')),
      Panel('Recent Winners',e('div',null,'Winner list')),
      Panel('Live Stats',e('div',null,'Online Players: 247'))
    ])
   ])
 ]);
}

ReactDOM.createRoot(document.getElementById('root')).render(e(App));
