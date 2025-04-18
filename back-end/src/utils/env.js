require('dotenv').config();
//SCUD Credentials
process.env.SCUD_URL=`http://${process.env.SCUD_HOST}/scud-brain/v1beta1`;

process.env.JWT_SECRET='XVA2JGDHFGH34233BY2001EYS00F19S74'
process.env.CONST_SECRET='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImZzRXh0ZW5zaW9uIjoiNjAwNSIsImZzRG9tYWluIjoieGxvZ2l4LmNvbSJ9LCJpYXQiOjE3MzYxNjUyMDh9.UACpgSHIfgjwfovUJ39B7QlzGryoFai50Nrql8XIWDY'


process.env.SOCKET_HOST = 'https://xlogixv2.zaincallstelephony.com:8443'; 