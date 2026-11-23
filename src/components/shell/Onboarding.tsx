import {useState} from 'react';
import {useApp} from '../../context/AppContext';
import {GoogleAccount} from '../../desktop/GoogleAccount';

export function Onboarding() {
  const {preferences,updatePreferences}=useApp();
  const [step,setStep]=useState(1);
  if(preferences.onboarding!=='open')return null;
  return <div className="fixed inset-0 bg-black/55 z-50 grid place-items-center"><section role="dialog" aria-modal="true" aria-label="Welcome to StudyFlow" className="rounded-xl p-6 w-full max-w-sm bg-[var(--bg-elevated)] space-y-4">
    <h1 className="text-lg font-semibold">{step===1?'Welcome to StudyFlow':'Your study profile'}</h1>
    {step===1 ? <><GoogleAccount/><button onClick={()=>setStep(2)}>{preferences.googleAccount?'Continue':'Continue with a local profile'}</button></> :
    <form className="grid gap-3" onSubmit={e=>{e.preventDefault();updatePreferences({onboarding:'complete'});}}>
      <label>Name <input required value={preferences.name} onChange={e=>updatePreferences({name:e.target.value})}/></label>
      <label>Area of study <input value={preferences.major} onChange={e=>updatePreferences({major:e.target.value})}/></label>
      <button>Finish setup</button></form>}
    <button className="text-xs" onClick={()=>updatePreferences({onboarding:'later'})}>Finish later</button>
  </section></div>;
}
