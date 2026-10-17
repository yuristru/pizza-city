from pathlib import Path
import math
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
FOOTPRINT = [(-1,-1), (1,-1), (1,.45), (.45,1), (-1,1)]
HEIGHT, PEAK = 1.65, 2.30
CAM_RIGHT = np.array([1,-1,0]) / math.sqrt(2)
CAM_UP = np.array([-.5/math.sqrt(2),-.5/math.sqrt(2),math.sqrt(.75)])
CAM_DEPTH = np.cross(CAM_RIGHT,CAM_UP)
if CAM_DEPTH.sum() < 0:
    CAM_DEPTH = -CAM_DEPTH
PALETTES = [('#e7b745','#9e2521'),('#e9dab7','#23694e'),('#db7052','#225a5b'),('#d8ae52','#74243a')]

def rgb(value):
    return np.array([int(value[i:i+2],16) for i in (1,3,5)], dtype=float)

def model(row):
    triangles = []
    plaster, accent = map(rgb, PALETTES[row])
    def polygon(vertices,color):
        vertices = np.asarray(vertices,dtype=float)
        for i in range(1,len(vertices)-1):
            triangles.append((vertices[[0,i,i+1]],np.array(color,dtype=float)))
    def box(lo,hi,color):
        x,y,z=lo; X,Y,Z=hi
        points=[(x,y,z),(X,y,z),(X,Y,z),(x,Y,z),(x,y,Z),(X,y,Z),(X,Y,Z),(x,Y,Z)]
        for ids in [(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]:
            polygon([points[i] for i in ids],color)
    for j,a in enumerate(FOOTPRINT):
        b=FOOTPRINT[(j+1)%5]
        polygon([(*a,0),(*b,0),(*b,HEIGHT),(*a,HEIGHT)],plaster)
        tangent=np.array(b)-a
        normal=np.array([tangent[1],-tangent[0]],dtype=float)
        normal/=np.linalg.norm(normal)
        def point(t,z,offset=.008):
            xy=np.array(a)+t*tangent+normal*offset
            return (*xy,z)
        def patch(t0,t1,z0,z1,color,offset=.008):
            polygon([point(t0,z0,offset),point(t1,z0,offset),point(t1,z1,offset),point(t0,z1,offset)],color)
        def window(t,width=.15):
            for z in (.24,.99):
                patch(t-width,t+width,z-.025,z+.405,rgb('#f5e9cf'))
                patch(t-width+.025,t+width-.025,z,z+.38,rgb('#263d45'),.012)
                patch(t-width-.10,t-width-.012,z,z+.38,accent,.014)
                patch(t+width+.012,t+width+.10,z,z+.38,accent,.014)
                patch(t-.012,t+.012,z,z+.38,rgb('#e6d3ad'),.017)
        if j==2:
            patch(.19,.81,0,.69,rgb('#eedcc0'))
            patch(.25,.75,.015,.66,rgb('#76502b'),.015)
            patch(.24,.76,.98,1.38,rgb('#eee2c6'))
            patch(.29,.71,1.01,1.35,rgb('#263d45'),.015)
            patch(.09,.23,1.01,1.35,accent,.018)
            patch(.77,.91,1.01,1.35,accent,.018)
            if row==0:
                center=np.array(point(.5,1.51,.025))
                u=np.array([*tangent,0]);u/=np.linalg.norm(u)
                polygon([center+u*(.085*math.cos(t))+np.array([0,0,.085*math.sin(t)]) for t in np.linspace(0,2*math.pi,25)],rgb('#f7f3dd'))
            if row==2:
                # Awning is geometry fixed exclusively to the chamfer face.
                p0=np.array(point(.08,.82,.02));p1=np.array(point(.92,.82,.02))
                forward=np.array([*normal,0])*.18+np.array([0,0,-.07])
                for s in range(7):
                    q0=p0+(p1-p0)*s/7;q1=p0+(p1-p0)*(s+1)/7
                    color=rgb('#f8eee0') if s%2 else rgb('#2c7951')
                    polygon([q0,q1,q1+forward,q0+forward],color)
                    polygon([q0+forward,q1+forward,q1+forward-[0,0,.055],q0+forward-[0,0,.055]],color)
        else:
            for t in (.28,.72):
                window(t,.095 if j in (0,4) else .12)
        # A shallow cornice follows all five walls, including the chamfer.
        polygon([point(0,HEIGHT-.035,.025),point(1,HEIGHT-.035,.025),point(1,HEIGHT+.025,.025),point(0,HEIGHT+.025,.025)],rgb('#f1dfbb'))
    polygon([(*p,0) for p in reversed(FOOTPRINT)],plaster)
    roof=[(x*1.045,y*1.045,HEIGHT+.035) for x,y in FOOTPRINT]
    for j in range(5):
        polygon([roof[j],roof[(j+1)%5],(0,0,PEAK)],rgb('#bc5a37'))
    # One physical chimney rotates with the entire mesh, never independently.
    box((.50,-.76,HEIGHT),(.76,-.50,2.61),rgb('#edcf97'))
    box((.46,-.80,2.61),(.80,-.46,2.67),rgb('#a64c30'))
    if row==2:
        for x in (.54,.69):
            box((x,-.68,2.67),(x+.07,-.58,2.82),rgb('#b45134'))
    else:
        box((.55,-.71,2.67),(.71,-.55,2.75),rgb('#a64c30'))
    return triangles

def rotation(k):
    a=k*math.pi/2
    return np.array([[math.cos(a),-math.sin(a),0],[math.sin(a),math.cos(a),0],[0,0,1]])

def render(triangles,k,size=1024):
    scale=size*120/512
    pixels=np.full((size,size,3),255,dtype=np.uint8)
    depth=np.full((size,size),-np.inf)
    rot=rotation(k)
    light=np.array([-.4,-.7,1.4]);light/=np.linalg.norm(light)
    for vertices,color in triangles:
        p=vertices@rot.T
        screen=np.column_stack((size*.5+(p@CAM_RIGHT)*scale,size*400/512-(p@CAM_UP)*scale))
        zs=p@CAM_DEPTH
        low=np.maximum(np.floor(screen.min(axis=0)).astype(int),0)
        high=np.minimum(np.ceil(screen.max(axis=0)).astype(int),size-1)
        if np.any(high<low): continue
        (ax,ay),(bx,by),(cx,cy)=screen
        denominator=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy)
        if abs(denominator)<1e-9: continue
        yy,xx=np.mgrid[low[1]:high[1]+1,low[0]:high[0]+1]
        xx=xx+.5;yy=yy+.5
        w0=((by-cy)*(xx-cx)+(cx-bx)*(yy-cy))/denominator
        w1=((cy-ay)*(xx-cx)+(ax-cx)*(yy-cy))/denominator
        w2=1-w0-w1
        z=w0*zs[0]+w1*zs[1]+w2*zs[2]
        area=depth[low[1]:high[1]+1,low[0]:high[0]+1]
        mask=(w0>=-1e-7)&(w1>=-1e-7)&(w2>=-1e-7)&(z>area)
        normal=np.cross(p[1]-p[0],p[2]-p[0]);normal/=np.linalg.norm(normal)
        shade=.72+.28*max(0,np.dot(normal,light))
        pixels[low[1]:high[1]+1,low[0]:high[0]+1][mask]=np.clip(color*shade,0,255).astype(np.uint8)
        area[mask]=z[mask]
    return Image.fromarray(pixels).resize((512,512),Image.Resampling.LANCZOS)

def export_obj(triangles,row):
    mats={tuple(c.astype(int)):i for i,(_,c) in enumerate(triangles)}
    obj=['# Five-sided two-storey corner house. Z up. Units arbitrary.',f'mtllib house-{row+1}.mtl']
    for vertices,_ in triangles:
        for p in vertices:
            obj.append('v '+' '.join(f'{v:.7f}' for v in p))
    for i,(_,color) in enumerate(triangles):
        obj.append(f'usemtl material{mats[tuple(color.astype(int))]}')
        obj.append(f'f {3*i+1} {3*i+2} {3*i+3}')
    (ROOT/f'house-{row+1}.obj').write_text('\n'.join(obj)+'\n')
    mtl=[]
    for color,i in mats.items():
        mtl.extend([f'newmtl material{i}','Kd '+' '.join(f'{c/255:.6f}' for c in color),'d 1','illum 1',''])
    (ROOT/f'house-{row+1}.mtl').write_text('\n'.join(mtl))

def main():
    atlas=Image.new('RGB',(2048,2048),'white')
    for row in range(4):
        triangles=model(row)
        export_obj(triangles,row)
        for k in range(4):
            atlas.paste(render(triangles,k),(512*k,512*row))
    atlas.save(ROOT/'corner-houses-3d-template.png')
    # Foundation corners are virtual corners of the full square, even when
    # a chamfer removes the physical vertex. This keeps all views on one grid.
    def project(point):
        p=np.asarray(point,dtype=float)
        return [float(256+(p@CAM_RIGHT)*120),float(400-(p@CAM_UP)*120)]
    metadata={
        'canvas':[2048,2048], 'cellSize':512,
        'camera':{'projection':'orthographic','elevationDegrees':30,'groundAxisSlope':0.5},
        'footprint':FOOTPRINT, 'wallHeight':HEIGHT, 'roofPeak':PEAK,
        'facadePixels':float(HEIGHT*CAM_UP[2]*120),
        'foundationCorners':[project(p) for p in [(-1,1,0),(1,1,0),(1,-1,0)]],
        'directions':['se','sw','nw','ne'], 'yawDegrees':[0,90,180,270],
        'chimneyWorldPosition':[.63,-.63],
    }
    (ROOT/'render-metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
    print('Created 4 OBJ models and a 2048x2048 atlas with 16 mesh renders.')
    # Verify rigid-body rotations and exact front-facade edge-on condition.
    point=np.array([1,.45,0]); other=np.array([.45,1,0])
    for k in (1,3):
        assert abs(((point-other)@rotation(k).T)@CAM_RIGHT)<1e-10
    assert np.allclose(np.linalg.matrix_power(rotation(1),4),np.eye(3))
    print('Validated: 90-degree rotations preserve geometry; chamfer has zero projected width in views 2 and 4.')

if __name__=='__main__': main()
