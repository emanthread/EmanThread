module.exports=[70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},63021,(e,t,r)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},62294,e=>{"use strict";var t=e.i(63021);let r=e.g.prisma??(process.env.DATABASE_URL||console.error("[db] Missing DATABASE_URL environment variable. Database queries will fail at runtime."),new t.PrismaClient({log:["error"]}));e.s(["prisma",0,r])},133,e=>{"use strict";var t=e.i(46245);let r=process.env.RESEND_API_KEY,a=process.env.RESEND_FROM_EMAIL||(process.env.MAIL_FROM?process.env.MAIL_FROM.includes("<")?process.env.MAIL_FROM:`Eman Thread <${process.env.MAIL_FROM}>`:"Eman Thread <noreply@emanthread.com>"),n="https://www.emanthread.com/",o=null;function i(){if(!o){if(!r)throw Error("RESEND_API_KEY is not configured in environment variables");o=new t.Resend(r)}return o}function s(e,t){return`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:40px 32px 32px;text-align:center;background:linear-gradient(135deg,#fbbf24,#f59e0b);">
              <h1 style="margin:0;font-size:24px;color:#1a1a1a;font-weight:700;">Eman Thread</h1>
              <p style="margin:8px 0 0;color:#4a4a4a;font-size:14px;">${e}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${t}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#fafafa;border-top:1px solid #eee;text-align:center;">
              <p style="margin:0;color:#999;font-size:12px;">
                &copy; ${new Date().getFullYear()} Eman Thread. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`}async function l(e,t){let r=`${n}/reset-password?token=${t}`;try{let{data:t,error:n}=await i().emails.send({from:a,to:e,subject:"Reset your Eman Thread password",html:s("Reset Your Password",`<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
          We received a request to reset your password. Click the button below to set a new password.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr>
            <td align="center">
              <a href="${r}" style="display:inline-block;padding:14px 36px;background-color:#f59e0b;color:#1a1a1a;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">Reset Password</a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 16px;color:#666;font-size:13px;line-height:1.5;">
          This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
        </p>
        <p style="margin:0;color:#999;font-size:12px;line-height:1.5;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${r}" style="color:#f59e0b;word-break:break-all;font-size:12px;">${r}</a>
        </p>`)});if(n)return console.error("[email] Resend password reset error:",n),{success:!1,error:n.message};return{success:!0}}catch(t){let e=t instanceof Error?t.message:"Failed to send email";return console.error("[email] Failed to send password reset email:",e),{success:!1,error:e}}}async function d(e,t){let r=`${n}/api/auth/verify-email?token=${t}`;try{let{data:t,error:n}=await i().emails.send({from:a,to:e,subject:"Verify your Eman Thread email",html:s("Verify Your Email Address",`<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
          Thank you for creating an account! Please click the button below to verify your email address.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr>
            <td align="center">
              <a href="${r}" style="display:inline-block;padding:14px 36px;background-color:#f59e0b;color:#1a1a1a;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">Verify Email</a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 16px;color:#666;font-size:13px;line-height:1.5;">
          This link will expire in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
        </p>
        <p style="margin:0;color:#999;font-size:12px;line-height:1.5;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${r}" style="color:#f59e0b;word-break:break-all;font-size:12px;">${r}</a>
        </p>`)});if(n)return console.error("[email] Resend verification email error:",n),{success:!1,error:n.message};return{success:!0}}catch(t){let e=t instanceof Error?t.message:"Failed to send email";return console.error("[email] Failed to send verification email:",e),{success:!1,error:e}}}async function c(e,t){try{let{data:r,error:o}=await i().emails.send({from:a,to:e,subject:"Welcome to Eman Thread — your email is verified!",html:s("Welcome to Eman Thread!",`<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
          Hi ${t},
        </p>
        <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
          Your email has been verified successfully. Welcome to the Eman Thread family!
        </p>
        <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
          You can now save your custom stitching profiles, track orders, and reuse your fit preferences effortlessly.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr>
            <td align="center">
              <a href="${n}/account" style="display:inline-block;padding:14px 36px;background-color:#f59e0b;color:#1a1a1a;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">Go to My Account</a>
            </td>
          </tr>
        </table>
        <p style="margin:0;color:#666;font-size:13px;line-height:1.5;">
          If you have any questions, feel free to reply to this email or contact our support team.
        </p>`)});if(o)return console.error("[email] Resend welcome email error:",o),{success:!1,error:o.message};return{success:!0}}catch(t){let e=t instanceof Error?t.message:"Failed to send email";return console.error("[email] Failed to send welcome email:",e),{success:!1,error:e}}}e.s(["generateToken",0,function(e=48){let t="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",r="";for(let a=0;a<e;a++){let e=crypto.getRandomValues(new Uint8Array(1))[0]%t.length;r+=t[e]}return r},"sendPasswordResetEmail",0,l,"sendVerificationEmail",0,d,"sendWelcomeEmail",0,c])},88293,e=>{"use strict";var t=e.i(47909),r=e.i(74017),a=e.i(96250),n=e.i(59756),o=e.i(61916),i=e.i(74677),s=e.i(69741),l=e.i(16795),d=e.i(87718),c=e.i(95169),p=e.i(47587),u=e.i(66012),f=e.i(70101),h=e.i(26937),m=e.i(70909),g=e.i(93695);e.i(20232);var x=e.i(220),y=e.i(62294),w=e.i(89171),v=e.i(22632),b=e.i(133);let R=v.z.object({email:v.z.string().email("Invalid email address")});async function E(e){try{let t=await e.json(),r=R.safeParse(t);if(!r.success)return w.NextResponse.json({error:r.error.errors[0].message},{status:400});let{email:a}=r.data,n=await y.prisma.user.findUnique({where:{email:a}});if(!n)return w.NextResponse.json({error:"No account found with this email"},{status:404});if(n.isVerified)return w.NextResponse.json({error:"Email is already verified. You can sign in."},{status:400});await y.prisma.emailVerificationToken.deleteMany({where:{userId:n.id}});let o=(0,b.generateToken)(48),i=new Date(Date.now()+864e5);await y.prisma.emailVerificationToken.create({data:{token:o,userId:n.id,expiresAt:i}});let s=await (0,b.sendVerificationEmail)(a,o);if(!s.success)return console.error("[resend-verification] Failed to send email:",s.error),w.NextResponse.json({error:"Failed to send verification email. Please try again later."},{status:500});return w.NextResponse.json({message:"Verification email sent. Please check your inbox."})}catch(e){return console.error("Resend verification error:",e),w.NextResponse.json({error:"Internal server error"},{status:500})}}e.s(["POST",0,E,"dynamic",0,"force-dynamic"],52978);var k=e.i(52978);let A=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/auth/resend-verification/route",pathname:"/api/auth/resend-verification",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/auth/resend-verification/route.ts",nextConfigOutput:"",userland:k}),{workAsyncStorage:T,workUnitAsyncStorage:C,serverHooks:P}=A;async function N(e,t,a){a.requestMeta&&(0,n.setRequestMeta)(e,a.requestMeta),A.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let y="/api/auth/resend-verification/route";y=y.replace(/\/index$/,"")||"/";let w=await A.prepare(e,t,{srcPage:y,multiZoneDraftMode:!1});if(!w)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:v,params:b,nextConfig:R,parsedUrl:E,isDraftMode:k,prerenderManifest:T,routerServerContext:C,isOnDemandRevalidate:P,revalidateOnlyGenerated:N,resolvedPathname:I,clientReferenceManifest:_,serverActionsManifest:q}=w,S=(0,s.normalizeAppPath)(y),M=!!(T.dynamicRoutes[S]||T.routes[I]),j=async()=>((null==C?void 0:C.render404)?await C.render404(e,t,E,!1):t.end("This page could not be found"),null);if(M&&!k){let e=!!T.routes[I],t=T.dynamicRoutes[S];if(t&&!1===t.fallback&&!e){if(R.adapterPath)return await j();throw new g.NoFallbackError}}let O=null;!M||A.isDev||k||(O="/index"===(O=I)?"/":O);let $=!0===A.isDev||!M,D=M&&!$;q&&_&&(0,i.setManifestsSingleton)({page:y,clientReferenceManifest:_,serverActionsManifest:q});let F=e.method||"GET",z=(0,o.getTracer)(),U=z.getActiveScopeSpan(),H=!!(null==C?void 0:C.isWrappedByNextServer),V=!!(0,n.getRequestMeta)(e,"minimalMode"),L=(0,n.getRequestMeta)(e,"incrementalCache")||await A.getIncrementalCache(e,R,T,V);null==L||L.resetRequestCache(),globalThis.__incrementalCache=L;let K={params:b,previewProps:T.preview,renderOpts:{experimental:{authInterrupts:!!R.experimental.authInterrupts},cacheComponents:!!R.cacheComponents,supportsDynamicResponse:$,incrementalCache:L,cacheLifeProfiles:R.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>A.onRequestError(e,t,a,n,C)},sharedContext:{buildId:v}},B=new l.NodeNextRequest(e),Y=new l.NodeNextResponse(t),W=d.NextRequestAdapter.fromNodeNextRequest(B,(0,d.signalFromNodeResponse)(t));try{let n,i=async e=>A.handle(W,K).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=z.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${F} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t),n&&n!==e&&(n.setAttribute("http.route",a),n.updateName(t))}else e.updateName(`${F} ${y}`)}),s=async n=>{var o,s;let l=async({previousCacheEntry:r})=>{try{if(!V&&P&&N&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let o=await i(n);e.fetchMetrics=K.renderOpts.fetchMetrics;let s=K.renderOpts.pendingWaitUntil;s&&a.waitUntil&&(a.waitUntil(s),s=void 0);let l=K.renderOpts.collectedTags;if(!M)return await (0,u.sendResponse)(B,Y,o,K.renderOpts.pendingWaitUntil),null;{let e=await o.blob(),t=(0,f.toNodeOutgoingHttpHeaders)(o.headers);l&&(t[m.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==K.renderOpts.collectedRevalidate&&!(K.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&K.renderOpts.collectedRevalidate,a=void 0===K.renderOpts.collectedExpire||K.renderOpts.collectedExpire>=m.INFINITE_CACHE?void 0:K.renderOpts.collectedExpire;return{value:{kind:x.CachedRouteKind.APP_ROUTE,status:o.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await A.onRequestError(e,t,{routerKind:"App Router",routePath:y,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:D,isOnDemandRevalidate:P})},!1,C),t}},d=await A.handleResponse({req:e,nextConfig:R,cacheKey:O,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:T,isRoutePPREnabled:!1,isOnDemandRevalidate:P,revalidateOnlyGenerated:N,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:V});if(!M)return null;if((null==d||null==(o=d.value)?void 0:o.kind)!==x.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(s=d.value)?void 0:s.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});V||t.setHeader("x-nextjs-cache",P?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),k&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let c=(0,f.fromNodeOutgoingHttpHeaders)(d.value.headers);return V&&M||c.delete(m.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||c.get("Cache-Control")||c.set("Cache-Control",(0,h.getCacheControlHeader)(d.cacheControl)),await (0,u.sendResponse)(B,Y,new Response(d.value.body,{headers:c,status:d.value.status||200})),null};H&&U?await s(U):(n=z.getActiveScopeSpan(),await z.withPropagatedContext(e.headers,()=>z.trace(c.BaseServerSpan.handleRequest,{spanName:`${F} ${y}`,kind:o.SpanKind.SERVER,attributes:{"http.method":F,"http.target":e.url}},s),void 0,!H))}catch(t){if(t instanceof g.NoFallbackError||await A.onRequestError(e,t,{routerKind:"App Router",routePath:S,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:D,isOnDemandRevalidate:P})},!1,C),M)throw t;return await (0,u.sendResponse)(B,Y,new Response(null,{status:500})),null}}e.s(["handler",0,N,"patchFetch",0,function(){return(0,a.patchFetch)({workAsyncStorage:T,workUnitAsyncStorage:C})},"routeModule",0,A,"serverHooks",0,P,"workAsyncStorage",0,T,"workUnitAsyncStorage",0,C],88293)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0115emu._.js.map