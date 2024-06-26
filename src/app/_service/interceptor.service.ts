import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HTTP_INTERCEPTORS, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, concatMap, filter, switchMap, take } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { JwtDTO } from '../_dto/jwtDto';
import { LoginService } from './login.service';
import { SessionService } from './session.service';
import Swal from 'sweetalert2';


const AUTHORIZATION = 'Authorization';

@Injectable({
  providedIn: 'root'
})
export class InterceptorService implements HttpInterceptor{

  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(
    private sessionService : SessionService,
    private loginService : LoginService,
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {  
    if (!this.sessionService.estaLogeado()) {
      return next.handle(req);
    }

    let intReq = req;
    const token = sessionStorage.getItem(environment.TOKEN_NAME);

    intReq = this.addToken(req, token);
    
    //console.log('prev refreshing....');

    return next.handle(intReq).pipe(catchError(error => {
      console.log('catchError-error - ',error); //dhr
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return this.handle401Error(intReq, next);

      } else  if (error instanceof HttpErrorResponse && error.status === 400) {  //dhr
        // Manejar errores 400 aquí y mostrar alerta
        console.log('error.error.message  - ',error.error.message); //dhr
        /*Swal.fire({
          title: 'Error',
          text: error.error.message,
          icon: 'error',
          confirmButtonText: 'OK'
        });*/
       

      }
       // Solo cerrar sesión para errores que no sean 400
       if (error.status !== 400) {
        this.sessionService.cerrarSession();
      }
     // this.sessionService.cerrarSession();
      
      return throwError(error);
    }));
    
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler) {
    if (!this.isRefreshing) {
      //console.log('refresing ...');
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      //const token = sessionStorage.getItem(environment.TOKEN_NAME);

      const token = this.sessionService.retornarJwt();
      
      if (token){

        const dto: JwtDTO = new JwtDTO(token);
        
        return this.loginService.refresh(dto).pipe(
          switchMap((data: any) => {
            this.isRefreshing = false;

            if(data.value){

              sessionStorage.setItem(environment.TOKEN_NAME,data.value);
              this.refreshTokenSubject.next(data.value);
              
              return next.handle(this.addToken(request, data.value));
            }
            else{

              this.sessionService.cerrarSession();

              return throwError('No se renovo token');
            }

          }),
          catchError((err) => {
            this.isRefreshing = false;
            this.sessionService.cerrarSession();
            return throwError(err);
          })
        );
      }
    }

    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap((token) => next.handle(this.addToken(request, token)))
    );
  }

  private addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({ headers: req.headers.set('Authorization', 'Bearer ' + token) });
  }
}

export const interceptorProvider = [{ provide: HTTP_INTERCEPTORS, useClass: InterceptorService, multi: true }];