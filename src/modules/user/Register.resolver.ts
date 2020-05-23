import { Arg, Ctx, Mutation, Resolver } from 'type-graphql'

import { User } from '../../entity/User.entity'
import { MailType, sendEmail } from '../utils/sendEmail'
import { createConfirmationUrl } from '../utils/createConfirmationUrl'
import { RegisterInput } from './register/RegisterInput'
import { MyContext } from '../../types/MyContext'
import {
  createAccessToken,
  createRefreshToken,
  sendAccessToken,
  sendRefreshToken,
} from '../../utils/auth'
import { LoginResponse } from './login/LoginResponse'

@Resolver()
export class RegisterResolver {
  @Mutation(() => LoginResponse)
  async register(
    @Arg('data')
    { name, email, password, username }: RegisterInput,
    @Ctx() { res }: MyContext
  ): Promise<LoginResponse> {
    let user

    // Issue 103: Prevent Email verification
    // using confirmed flag to decide if user has to be verfied
    // just comment below line to start verfication
    const confirmed = true

    try {
      user = await User.create({
        name,
        email,
        username,
        password, // hashing this in @BeforeInsert hook in User.entity.ts
        confirmed,
      }).save()
    } catch (e) {
      console.error(e)
      throw new Error('Error while registering user')
    }

    if (!user.confirmed) {
      sendEmail(
        email,
        await createConfirmationUrl(user.id),
        MailType.ConfirmationEmail
      )
    }

    sendRefreshToken(res, createRefreshToken(user))
    sendAccessToken(res, createAccessToken(user.id))
    return { accessToken: createAccessToken(user.id), user }
  }
}
