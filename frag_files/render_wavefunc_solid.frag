float sceneDist( vec3 p, float f, vec3 df, vec3 ray ) {
    float nearest = length(p);
    float dlen = length(df);
    float angle = dot(df, ray);
    float dr = (ISOVAL - abs(f))/(0.5 + abs(angle));
    return dr;
}

vec3 sceneColor( vec3 p, float f, vec3 df ) {
    if( abs(abs(f) - ISOVAL) < EPS*2.0){
        return (f > 0.0)? vec3(1.0, 0.0, 0.0): vec3(0.0, 0.0, 1.0);
   }
   return vec3(0.0, 0.0, 0.0);
}

vec3 getNormal( vec3 p, float f, vec3 df ) {
    float len = length(df);
    return - sign(f)*df/len;
}

float getShadow( vec3 ro, vec3 rd, float f, vec3 df ) {
    float h = 0.0;
    float c = 0.0;
    float r = 1.0;
    float shadowCoef = 0.5;
    for ( float t = 0.0; t< ITER_SHADOW; t++ ) {
        h = sceneDist( ro + rd * c, f, df, rd );
        if ( h < EPS ) return shadowCoef;
        r = min( r, h * 16.0 / (c + EPS));
        c += h;
    }
    return 1.0 - shadowCoef + r * shadowCoef;
}

vec3 getRayColor( vec3 origin, vec3 ray, out vec3 pos, out vec3 normal, out bool hit ) {
    // marching loop
    float dist;
    float depth = 0.0;
    pos = origin;
    for ( int i = 0; i < ITER; i++ ){
        float f = wavefunc(pos);
        vec3 df = wavefunc_d(pos, f);
        dist = sceneDist( pos, f, df, ray );
        depth += dist;
        pos = origin + depth * ray;
        if ( abs(dist) < EPS ) break;
    }
    // hit check and calc color
    vec3 color;
    const float matness = 1.0;

    if ( abs(dist) < EPS ) {
        float f = wavefunc(pos);
        vec3 df = wavefunc_d(pos, f);
        normal = getNormal( pos, f, df );
        float diffuse = clamp( dot( lightDir, normal ), 0.1, 1.0 );
        float specular = clamp( dot( reflect( lightDir, normal ), ray ), 0.0, 1.0 );
        //float shadow = getShadow( pos + normal * OFFSET, lightDir, f, df );
        //color = ( sceneColor( pos, f, df ) + vec3( 1.0 - matness ) * specular + vec3( matness) * diffuse ) * max( 0.5, shadow );
        color = ( sceneColor( pos, f, df ) + vec3( 1.0 - matness ) * specular + vec3( matness) * diffuse )*0.5;
        hit = true;
    } else {
        color = vec3( 0.4 );
    }
    return color;// - pow( clamp( 0.05 * depth, 0.0, 0.6 ), 2.0 ) * 0.1;
}
void main(void) {
    // screen position
    vec2 screenPos = ( gl_FragCoord.xy * 2.0 - resolution ) / min( resolution.x, resolution.y );
    // convert ray direction from screen coordinate to world coordinate
    vec3 ray = (cameraWorldMatrix * cameraProjectionMatrixInverse * vec4( screenPos.xy, 1.0, 1.0 )).xyz;
    ray = normalize( ray );
    // camera position
    vec3 cPos = cameraPosition;
    // cast ray
    vec3 color = vec3( 0.0 );
    vec3 pos, normal;
    bool hit;
    float alpha = 1.0;
    for ( int i = 0; i < 3; i++ ) {
        color += alpha * getRayColor( cPos, ray, pos, normal, hit );
        alpha *= 0.3;
        ray = normalize( reflect( ray, normal ) );
        cPos = pos + normal * OFFSET;
        if ( !hit ) break;
    }
    gl_FragColor = vec4( color, 1.0 );
}