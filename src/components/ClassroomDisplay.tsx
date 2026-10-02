import {useEffect, useState} from 'react';
import {Platform, StyleSheet, Text} from 'react-native';
import {Button} from './Button';
import {Card} from './Card';
import {colours} from '../theme';
export interface PupilSnapshot {
 mode: 'idle' | 'name' | 'timer' | 'paused';
 name?: string;
 avatar?: string;
 prompt?: string;
 phase?: 'think' | 'pair' | 'check';
 endsAt?: number;
 progress?: {round: number; picked: number; total: number};
}
interface DisplayStatus {phase: string; message: string; available: boolean; code?: string;}
interface DisplayBridge {status:()=>DisplayStatus;connect:()=>Promise<void>;end:()=>Promise<void>;publish:(value:PupilSnapshot)=>void;clear:()=>void;}
declare global {interface Window {COLD_CALL_DISPLAY?: DisplayBridge;}}
const bridge=()=>Platform.OS==='web'?window.COLD_CALL_DISPLAY:undefined;
export function usePupilDisplay(snapshot:PupilSnapshot) {
 useEffect(()=>{bridge()?.publish(snapshot);},[snapshot]);
 useEffect(()=>()=>{bridge()?.clear();},[]);
}
export function ClassroomDisplay() {
 const [status,setStatus]=useState<DisplayStatus>({phase:'idle',message:'',available:false});
 useEffect(()=>{
  if(Platform.OS!=='web')return;
  const update=()=>{const next=bridge()?.status();if(next)setStatus(next);};
  update();window.addEventListener('tnt-display-status',update);
  return ()=>window.removeEventListener('tnt-display-status',update);
 },[]);
 if(Platform.OS!=='web' || !status.available)return null;
 const linked=['connected','connecting','confirm','reconnecting'].includes(status.phase);
 return <Card>
  <Text style={styles.title}>Control a classroom screen</Text>
  <Text style={styles.description}>{status.message || 'Open Classroom display on the laptop, then scan its private QR code with your phone. Your phone controls the lesson; the screen shows only names, timers and pupil prompts.'}</Text>
  {status.phase==='confirm'?<Text style={styles.code}>{status.code}</Text>:null}
  {status.phase==='invited'?<Button onPress={()=>{void bridge()?.connect();}}>Connect this device</Button>:null}
  {linked?<Button compact variant="ghost" onPress={()=>{void bridge()?.end();}}>Disconnect screen</Button>:<Button compact variant="ghost" onPress={()=>{window.open(new URL('display.html',window.location.href).href,'_blank','noopener');}}>Open classroom display on this device</Button>}
  <Button compact variant="ghost" onPress={()=>{window.location.hash='projection-guide';}}>How to project · laptop or phone</Button>
  <Text style={styles.note}>Pair before projecting. Keep the phone awake and this page open. Class lists and response records stay on this device. Both devices need internet.</Text>
 </Card>;
}
const styles=StyleSheet.create({title:{fontSize:18,fontWeight:'800',color:colours.ink},description:{fontSize:14,lineHeight:21,color:colours.inkMuted,marginVertical:12},note:{fontSize:12,lineHeight:18,color:colours.inkMuted,marginTop:10},code:{fontSize:32,fontWeight:'800',letterSpacing:4,marginBottom:12,color:colours.ink}});
