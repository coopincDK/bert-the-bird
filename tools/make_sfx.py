# Original procedural sound effects for Bert The Bird (made from scratch, no samples).
import numpy as np, wave, subprocess, os
SR = 44100
rng = np.random.default_rng(7)
def t(d): return np.arange(int(SR*d))/SR
def env(n, a=0.005, r=None, curve=3.0):
    x = np.ones(n); A = max(1,int(SR*a)); x[:A] = np.linspace(0,1,A)
    rel = np.linspace(1,0,n-A)**curve; x[A:] *= rel; return x
def sweep(f0, f1, d, shape='sine'):
    tt = t(d); f = f0*(f1/f0)**(tt/d); ph = 2*np.pi*np.cumsum(f)/SR
    if shape=='sine': return np.sin(ph)
    if shape=='square': return np.sign(np.sin(ph))*0.6
    if shape=='tri': return 2/np.pi*np.arcsin(np.sin(ph))
def lowpass(x, cutoff):
    # one-pole lowpass; cutoff may be array
    c = np.broadcast_to(np.asarray(cutoff, float), x.shape)
    a = np.exp(-2*np.pi*c/SR); y = np.zeros_like(x); s = 0.0
    for i in range(len(x)): s = (1-a[i])*x[i] + a[i]*s; y[i] = s
    return y
def highpass(x, cutoff): return x - lowpass(x, cutoff)
def noise(d): return rng.uniform(-1,1,int(SR*d))
def save(name, x, gain=0.9):
    x = x/ (np.max(np.abs(x))+1e-9) * gain
    pcm = (x*32767).astype(np.int16)
    with wave.open(name+'.wav','wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',name+'.wav','-codec:a','libmp3lame','-q:a','4',name+'.mp3'],check=True)

# coin: two quick bright notes
a = sweep(987.8,987.8,0.07,'square')*env(int(SR*0.07),0.002,curve=0.8)
b = sweep(1318.5,1318.5,0.16,'square')*env(int(SR*0.16),0.002,curve=2)
save('coin', lowpass(np.concatenate([a,b]), 6000), 0.7)
# pop: bubbly pitch drop
x = sweep(900,260,0.09)*env(int(SR*0.09),0.001,curve=2.5); save('pop', x, 0.8)
# explosion: noise burst, closing filter, low thump
n = int(SR*0.9); nz = noise(0.9)*env(n,0.003,curve=2.2)
y = lowpass(nz, np.linspace(3500,180,n)) + 0.8*sweep(110,40,0.9)*env(n,0.002,curve=3)
save('explosion', y, 0.85)
# shield on: rising shimmer
x = (sweep(300,1200,0.35)+0.4*sweep(600,2400,0.35))*env(int(SR*0.35),0.01,curve=1.5); save('shield-on', x, 0.6)
# shield off: falling
x = (sweep(1100,280,0.3)+0.3*sweep(2200,560,0.3))*env(int(SR*0.3),0.005,curve=1.8); save('shield-off', x, 0.55)
# shield break: glassy crash
n=int(SR*0.45); x = highpass(noise(0.45),2500)*env(n,0.001,curve=4)
for f in (1760, 2349, 3136): x += 0.35*sweep(f, f*0.7, 0.45)*env(n,0.001,curve=3)
save('shield-break', x, 0.7)
# magnet up / down: wobbly sweep
tt=t(0.4); wob = 1+0.08*np.sin(2*np.pi*18*tt)
x = np.sin(2*np.pi*np.cumsum(200*(3**(tt/0.4))*wob)/SR)*env(len(tt),0.01,curve=1.2); save('magnet-up', x, 0.6)
x = np.sin(2*np.pi*np.cumsum(600*((1/3)**(tt/0.4))*wob)/SR)*env(len(tt),0.01,curve=1.2); save('magnet-down', x, 0.6)
# magnet running: seamless low hum loop (2.0 s, whole cycles)
tt=t(2.0); x = np.sin(2*np.pi*110*tt)*0.6+np.sin(2*np.pi*220*tt)*0.25+np.sin(2*np.pi*55*tt)*0.3
x *= 1+0.15*np.sin(2*np.pi*4*tt); save('magnet-running', x, 0.35)
# splat (Fugleklat): wet short burst
n=int(SR*0.22); x = lowpass(noise(0.22), np.linspace(2500,300,n))*env(n,0.001,curve=3) + 0.5*sweep(320,90,0.22)*env(n,0.001,curve=4)
save('splat', x, 0.75)
# drop: little falling whistle when a klat leaves Bert
x = sweep(1400,700,0.12)*env(int(SR*0.12),0.002,curve=2); save('drop', x, 0.4)
# lava eruption: rumble + bubbling
n=int(SR*0.8); rum = lowpass(noise(0.8),160)*4*env(n,0.05,curve=1.5)
bub = np.zeros(n)
for k in range(9):
    s = int(rng.uniform(0, n-SR*0.08)); seg = sweep(rng.uniform(180,420), rng.uniform(500,900), 0.06)*env(int(SR*0.06),0.002,curve=2)
    bub[s:s+len(seg)] += seg*0.5
save('lava', rum+bub, 0.8)
# meteor: rising-then-falling whoosh
n=int(SR*0.7); cut = 400+3000*np.sin(np.linspace(0,np.pi,n))
x = lowpass(noise(0.7), cut)*np.sin(np.linspace(0,np.pi,n))**1.5; save('whoosh', x, 0.75)
# wind gust: long filtered swell
n=int(SR*1.6); cut = 300+900*np.sin(np.linspace(0,np.pi,n))**2
x = lowpass(highpass(noise(1.6),150), cut)*np.sin(np.linspace(0,np.pi,n))**1.2; save('wind', x, 0.7)
# ice crack: sharp crackles
n=int(SR*0.35); x = np.zeros(n)
for k in range(7):
    s = int(rng.uniform(0, n*0.7)); L = int(SR*rng.uniform(0.004,0.012))
    seg = highpass(rng.uniform(-1,1,L),1800)*np.linspace(1,0,L); x[s:s+L] += seg
x += 0.25*highpass(noise(0.35),3000)*env(n,0.001,curve=5)
save('crack', x, 0.8)
print(sorted(f for f in os.listdir('.') if f.endswith('.mp3')))

# miss: soft two-note "aww" when a star is missed (replaces the harsh explosion)
a = sweep(587.3, 560, 0.09, 'tri')*env(int(SR*0.09),0.004,curve=1.5)
b = sweep(440, 392, 0.16, 'tri')*env(int(SR*0.16),0.004,curve=2.5)
save('miss', lowpass(np.concatenate([a, np.zeros(int(SR*0.02)), b]), 2500), 0.45)
