import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { Cuestionario } from '../_model/cuestionario';



@Injectable({
  providedIn: 'root'
})

export class CuestionarioService {

    url: string = `${environment.HOST}/cuestionarios`;
    userCambio = new Subject<any[]>();
  
    token: string = sessionStorage.getItem(environment.TOKEN_NAME);
    httpOptions : any;
  
  
    constructor(
      private http: HttpClient
    ) { }

    findById(idCuestionario: number): Observable<Cuestionario> {
      return this.http.get<Cuestionario>(`${this.url}/${idCuestionario}`);
    }

    findCuestionarioByIdMax(): Observable<Cuestionario> {
      return this.http.get<Cuestionario>(`${this.url}/lastId`);
    }
  
  }
  