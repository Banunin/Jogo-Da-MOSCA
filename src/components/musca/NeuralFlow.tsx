import { Eye, Focus, ScanEye, Database, Brain, Move, Navigation } from "lucide-react";
import type { GameSnapshot, BrainModuleId } from "@/game/types";
const nodes: Array<{id:BrainModuleId;name:string;Icon:typeof Eye;note:string}>=[
  {id:"vision",name:"Visão",Icon:Eye,note:"Entrada visual"},
  {id:"perception",name:"Percepção",Icon:ScanEye,note:"Reconhecimento"},
  {id:"attention",name:"Atenção",Icon:Focus,note:"Seleção de sinais"},
  {id:"memory",name:"Memória",Icon:Database,note:"Locais registrados"},
  {id:"consciousness",name:"Consciência",Icon:Brain,note:"Estado interno"},
  {id:"navigation",name:"Navegação",Icon:Navigation,note:"Direção do alvo"},
  {id:"motor",name:"Movimento",Icon:Move,note:"Resposta motora"},
];
export function NeuralFlow({snapshot}:{snapshot:GameSnapshot}){
  return <ol className="neural-flow" aria-label="Ciclo de percepção e resposta">
    {nodes.map(({id,name,Icon,note})=><li key={id} className={snapshot.modules[id]===0?"off":""}>
      <Icon size={20} aria-hidden="true"/><div><strong>{name}</strong><small>{note}</small></div>
      <span>{Math.round(snapshot.modules[id]*100)}%<small>{snapshot.modules[id]===0?"Desativado":snapshot.modules[id]<1?"Reduzido":"Habilitado"}</small></span>
    </li>)}
  </ol>;
}
