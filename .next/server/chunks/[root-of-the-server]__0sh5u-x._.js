module.exports=[70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},63021,(e,t,r)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},62294,e=>{"use strict";var t=e.i(63021);let r=e.g.prisma??(process.env.DATABASE_URL||console.error("[db] Missing DATABASE_URL environment variable. Database queries will fail at runtime."),new t.PrismaClient({log:["error"]}));e.s(["prisma",0,r])},133,e=>{"use strict";var t=e.i(46245);let r=process.env.RESEND_API_KEY,a=process.env.RESEND_FROM_EMAIL||(process.env.MAIL_FROM?process.env.MAIL_FROM.includes("<")?process.env.MAIL_FROM:`Eman Thread <${process.env.MAIL_FROM}>`:"Eman Thread <noreply@emanthread.com>"),n="https://www.emanthread.com/",i=null;function o(){if(!i){if(!r)throw Error("RESEND_API_KEY is not configured in environment variables");i=new t.Resend(r)}return i}function s(e,t){return`<!DOCTYPE html>
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
</html>`}async function l(e,t){let r=`${n}/reset-password?token=${t}`;try{let{data:t,error:n}=await o().emails.send({from:a,to:e,subject:"Reset your Eman Thread password",html:s("Reset Your Password",`<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
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
        </p>`)});if(n)return console.error("[email] Resend password reset error:",n),{success:!1,error:n.message};return{success:!0}}catch(t){let e=t instanceof Error?t.message:"Failed to send email";return console.error("[email] Failed to send password reset email:",e),{success:!1,error:e}}}async function d(e,t){let r=`${n}/api/auth/verify-email?token=${t}`;try{let{data:t,error:n}=await o().emails.send({from:a,to:e,subject:"Verify your Eman Thread email",html:s("Verify Your Email Address",`<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
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
        </p>`)});if(n)return console.error("[email] Resend verification email error:",n),{success:!1,error:n.message};return{success:!0}}catch(t){let e=t instanceof Error?t.message:"Failed to send email";return console.error("[email] Failed to send verification email:",e),{success:!1,error:e}}}async function c(e,t){try{let{data:r,error:i}=await o().emails.send({from:a,to:e,subject:"Welcome to Eman Thread — your email is verified!",html:s("Welcome to Eman Thread!",`<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
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
        </p>`)});if(i)return console.error("[email] Resend welcome email error:",i),{success:!1,error:i.message};return{success:!0}}catch(t){let e=t instanceof Error?t.message:"Failed to send email";return console.error("[email] Failed to send welcome email:",e),{success:!1,error:e}}}e.s(["generateToken",0,function(e=48){let t="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",r="";for(let a=0;a<e;a++){let e=crypto.getRandomValues(new Uint8Array(1))[0]%t.length;r+=t[e]}return r},"sendPasswordResetEmail",0,l,"sendVerificationEmail",0,d,"sendWelcomeEmail",0,c])},3961,e=>{"use strict";var t=e.i(47909),r=e.i(74017),a=e.i(96250),n=e.i(59756),i=e.i(61916),o=e.i(74677),s=e.i(69741),l=e.i(16795),d=e.i(87718),c=e.i(95169),p=e.i(47587),u=e.i(66012),f=e.i(70101),m=e.i(26937),h=e.i(70909),g=e.i(93695);e.i(20232);var x=e.i(220),y=e.i(62294),w=e.i(89171),v=e.i(133);async function b(e){try{let{searchParams:t}=new URL(e.url),r=t.get("token");if(!r)return w.NextResponse.redirect(new URL("/login?error=missing_token",e.url));let a=await y.prisma.emailVerificationToken.findUnique({where:{token:r},include:{user:!0}});if(!a)return w.NextResponse.redirect(new URL("/login?error=invalid_token",e.url));if(new Date>a.expiresAt)return await y.prisma.emailVerificationToken.delete({where:{id:a.id}}).catch(()=>{}),w.NextResponse.redirect(new URL("/login?error=expired_token",e.url));let n=a.user.name;return await y.prisma.$transaction([y.prisma.user.update({where:{id:a.userId},data:{isVerified:!0}}),y.prisma.emailVerificationToken.delete({where:{id:a.id}})]),(0,w.after)(()=>{(0,v.sendWelcomeEmail)(a.user.email,n).catch(e=>{console.error("[verify-email] Failed to send welcome email:",e)})}),w.NextResponse.redirect(new URL("/login?verified=true",e.url))}catch(t){return console.error("Email verification error:",t),w.NextResponse.redirect(new URL("/login?error=verification_failed",e.url))}}e.s(["GET",0,b,"dynamic",0,"force-dynamic"],47558);var R=e.i(47558);let E=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/auth/verify-email/route",pathname:"/api/auth/verify-email",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/auth/verify-email/route.ts",nextConfigOutput:"",userland:R}),{workAsyncStorage:k,workUnitAsyncStorage:A,serverHooks:T}=E;async function C(e,t,a){a.requestMeta&&(0,n.setRequestMeta)(e,a.requestMeta),E.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let y="/api/auth/verify-email/route";y=y.replace(/\/index$/,"")||"/";let w=await E.prepare(e,t,{srcPage:y,multiZoneDraftMode:!1});if(!w)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:v,params:b,nextConfig:R,parsedUrl:k,isDraftMode:A,prerenderManifest:T,routerServerContext:C,isOnDemandRevalidate:_,revalidateOnlyGenerated:N,resolvedPathname:P,clientReferenceManifest:q,serverActionsManifest:I}=w,S=(0,s.normalizeAppPath)(y),M=!!(T.dynamicRoutes[S]||T.routes[P]),O=async()=>((null==C?void 0:C.render404)?await C.render404(e,t,k,!1):t.end("This page could not be found"),null);if(M&&!A){let e=!!T.routes[P],t=T.dynamicRoutes[S];if(t&&!1===t.fallback&&!e){if(R.adapterPath)return await O();throw new g.NoFallbackError}}let U=null;!M||E.isDev||A||(U="/index"===(U=P)?"/":U);let $=!0===E.isDev||!M,D=M&&!$;I&&q&&(0,o.setManifestsSingleton)({page:y,clientReferenceManifest:q,serverActionsManifest:I});let F=e.method||"GET",j=(0,i.getTracer)(),z=j.getActiveScopeSpan(),H=!!(null==C?void 0:C.isWrappedByNextServer),L=!!(0,n.getRequestMeta)(e,"minimalMode"),V=(0,n.getRequestMeta)(e,"incrementalCache")||await E.getIncrementalCache(e,R,T,L);null==V||V.resetRequestCache(),globalThis.__incrementalCache=V;let K={params:b,previewProps:T.preview,renderOpts:{experimental:{authInterrupts:!!R.experimental.authInterrupts},cacheComponents:!!R.cacheComponents,supportsDynamicResponse:$,incrementalCache:V,cacheLifeProfiles:R.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>E.onRequestError(e,t,a,n,C)},sharedContext:{buildId:v}},B=new l.NodeNextRequest(e),W=new l.NodeNextResponse(t),Y=d.NextRequestAdapter.fromNodeNextRequest(B,(0,d.signalFromNodeResponse)(t));try{let n,o=async e=>E.handle(Y,K).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=j.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${F} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t),n&&n!==e&&(n.setAttribute("http.route",a),n.updateName(t))}else e.updateName(`${F} ${y}`)}),s=async n=>{var i,s;let l=async({previousCacheEntry:r})=>{try{if(!L&&_&&N&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await o(n);e.fetchMetrics=K.renderOpts.fetchMetrics;let s=K.renderOpts.pendingWaitUntil;s&&a.waitUntil&&(a.waitUntil(s),s=void 0);let l=K.renderOpts.collectedTags;if(!M)return await (0,u.sendResponse)(B,W,i,K.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),t=(0,f.toNodeOutgoingHttpHeaders)(i.headers);l&&(t[h.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==K.renderOpts.collectedRevalidate&&!(K.renderOpts.collectedRevalidate>=h.INFINITE_CACHE)&&K.renderOpts.collectedRevalidate,a=void 0===K.renderOpts.collectedExpire||K.renderOpts.collectedExpire>=h.INFINITE_CACHE?void 0:K.renderOpts.collectedExpire;return{value:{kind:x.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await E.onRequestError(e,t,{routerKind:"App Router",routePath:y,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:D,isOnDemandRevalidate:_})},!1,C),t}},d=await E.handleResponse({req:e,nextConfig:R,cacheKey:U,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:T,isRoutePPREnabled:!1,isOnDemandRevalidate:_,revalidateOnlyGenerated:N,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:L});if(!M)return null;if((null==d||null==(i=d.value)?void 0:i.kind)!==x.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(s=d.value)?void 0:s.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});L||t.setHeader("x-nextjs-cache",_?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),A&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let c=(0,f.fromNodeOutgoingHttpHeaders)(d.value.headers);return L&&M||c.delete(h.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||c.get("Cache-Control")||c.set("Cache-Control",(0,m.getCacheControlHeader)(d.cacheControl)),await (0,u.sendResponse)(B,W,new Response(d.value.body,{headers:c,status:d.value.status||200})),null};H&&z?await s(z):(n=j.getActiveScopeSpan(),await j.withPropagatedContext(e.headers,()=>j.trace(c.BaseServerSpan.handleRequest,{spanName:`${F} ${y}`,kind:i.SpanKind.SERVER,attributes:{"http.method":F,"http.target":e.url}},s),void 0,!H))}catch(t){if(t instanceof g.NoFallbackError||await E.onRequestError(e,t,{routerKind:"App Router",routePath:S,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:D,isOnDemandRevalidate:_})},!1,C),M)throw t;return await (0,u.sendResponse)(B,W,new Response(null,{status:500})),null}}e.s(["handler",0,C,"patchFetch",0,function(){return(0,a.patchFetch)({workAsyncStorage:k,workUnitAsyncStorage:A})},"routeModule",0,E,"serverHooks",0,T,"workAsyncStorage",0,k,"workUnitAsyncStorage",0,A],3961)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0sh5u-x._.js.map